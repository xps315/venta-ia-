// server.js — NEXUS AI Backend API
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const { pool, initDB } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'nexus_secret_2024';

// ─── MIDDLEWARE ───────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // 10mb para face_data base64

// ─── AUTH MIDDLEWARE ──────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ─── HEALTH CHECK ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), version: '1.0.0' });
});

// ─── AUTH: REGISTRO ───────────────────────────────────────
// POST /api/auth/register
// Body: { username, password }
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  if (password.length < 4)
    return res.status(400).json({ error: 'Contraseña mínimo 4 caracteres' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, created_at',
      [username.toLowerCase().trim(), hash]
    );
    const user = rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success: true, token, user: { id: user.id, username: user.username } });
  } catch (e) {
    if (e.code === '23505')
      return res.status(409).json({ error: 'Ese nombre de usuario ya existe' });
    console.error(e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── AUTH: GUARDAR BIOMETRÍA (face_data) ─────────────────
// POST /api/auth/save-face
// Headers: Authorization: Bearer <token>
// Body: { face_data: "data:image/jpeg;base64,..." }
app.post('/api/auth/save-face', auth, async (req, res) => {
  const { face_data } = req.body;
  if (!face_data) return res.status(400).json({ error: 'face_data requerido' });

  try {
    await pool.query(
      'UPDATE users SET face_data = $1 WHERE id = $2',
      [face_data, req.user.id]
    );
    res.json({ success: true, message: 'Biometría guardada correctamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error guardando biometría' });
  }
});

// ─── AUTH: LOGIN ──────────────────────────────────────────
// POST /api/auth/login
// Body: { username, password }
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username.toLowerCase().trim()]
    );
    if (!rows.length)
      return res.status(401).json({ error: 'Usuario no encontrado' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ error: 'Contraseña incorrecta' });

    // Actualizar last_login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, has_face: !!user.face_data },
      face_data: user.face_data || null
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── DASHBOARD: KPIs ─────────────────────────────────────
// GET /api/dashboard/kpis
app.get('/api/dashboard/kpis', auth, async (req, res) => {
  try {
    const [ventasMes, ventasPrev, transHoy, eficiencia] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(monto),0) AS total FROM ventas
                  WHERE fecha >= date_trunc('month', CURRENT_DATE)`),
      pool.query(`SELECT COALESCE(SUM(monto),0) AS total FROM ventas
                  WHERE fecha >= date_trunc('month', CURRENT_DATE - interval '1 month')
                    AND fecha < date_trunc('month', CURRENT_DATE)`),
      pool.query(`SELECT COUNT(*) AS total FROM ventas WHERE fecha = CURRENT_DATE`),
      pool.query(`SELECT COALESCE(AVG(eficiencia),94.7) AS val FROM metricas_diarias
                  WHERE fecha >= CURRENT_DATE - 7`)
    ]);

    const actual = parseFloat(ventasMes.rows[0].total);
    const prev   = parseFloat(ventasPrev.rows[0].total) || 1;
    const camb   = (((actual - prev) / prev) * 100).toFixed(1);

    res.json({
      ventas_mes:      actual,
      prediccion_mes:  Math.round(actual * 1.231),
      transacciones:   parseInt(transHoy.rows[0].total),
      eficiencia:      parseFloat(eficiencia.rows[0].val).toFixed(1),
      cambio_pct:      camb
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error obteniendo KPIs' });
  }
});

// ─── DASHBOARD: VENTAS HISTÓRICAS (gráfico) ──────────────
// GET /api/dashboard/ventas-historicas?meses=9
app.get('/api/dashboard/ventas-historicas', auth, async (req, res) => {
  const meses = parseInt(req.query.meses) || 9;
  try {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(date_trunc('month', fecha), 'Mon') AS mes,
        date_trunc('month', fecha)                 AS fecha_mes,
        SUM(monto)::numeric(12,2)                  AS total
      FROM ventas
      WHERE fecha >= date_trunc('month', CURRENT_DATE) - interval '${meses} months'
      GROUP BY date_trunc('month', fecha)
      ORDER BY fecha_mes ASC
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error obteniendo historial' });
  }
});

// ─── DASHBOARD: PREDICCIONES ─────────────────────────────
// GET /api/dashboard/predicciones
app.get('/api/dashboard/predicciones', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM predicciones ORDER BY prediccion DESC'
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error obteniendo predicciones' });
  }
});

// ─── DASHBOARD: VENTAS POR CANAL ─────────────────────────
// GET /api/dashboard/canales
app.get('/api/dashboard/canales', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT canal, SUM(monto)::numeric(12,2) AS total, COUNT(*) AS transacciones
      FROM ventas
      GROUP BY canal
      ORDER BY total DESC
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error obteniendo canales' });
  }
});

// ─── VENTAS: CREAR ───────────────────────────────────────
// POST /api/ventas
// Body: { producto, canal, monto, fecha? }
app.post('/api/ventas', auth, async (req, res) => {
  const { producto, canal, monto, fecha } = req.body;
  if (!producto || !monto)
    return res.status(400).json({ error: 'producto y monto requeridos' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO ventas (user_id, producto, canal, monto, fecha)
       VALUES ($1,$2,$3,$4, COALESCE($5::date, CURRENT_DATE))
       RETURNING *`,
      [req.user.id, producto, canal || 'Web', monto, fecha || null]
    );
    res.status(201).json({ success: true, venta: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error creando venta' });
  }
});

// ─── VENTAS: LISTAR ──────────────────────────────────────
// GET /api/ventas?limit=50
app.get('/api/ventas', auth, async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ventas ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error listando ventas' });
  }
});

// ─── START ────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 NEXUS AI Backend corriendo en http://localhost:${PORT}`);
    console.log(`📊 API docs: http://localhost:${PORT}/api/health\n`);
  });
}).catch(e => {
  console.error('❌ Error iniciando DB:', e.message);
  process.exit(1);
});
