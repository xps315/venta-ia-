// db.js — Conexión a Neon PostgreSQL y creación de tablas
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Crear tablas si no existen
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           SERIAL PRIMARY KEY,
        username     VARCHAR(50)  UNIQUE NOT NULL,
        password     TEXT         NOT NULL,
        face_data    TEXT,
        created_at   TIMESTAMP    DEFAULT NOW(),
        last_login   TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ventas (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER REFERENCES users(id),
        producto     VARCHAR(100) NOT NULL,
        canal        VARCHAR(50),
        monto        NUMERIC(12,2) NOT NULL,
        fecha        DATE         DEFAULT CURRENT_DATE,
        created_at   TIMESTAMP    DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS predicciones (
        id           SERIAL PRIMARY KEY,
        producto     VARCHAR(100) NOT NULL,
        venta_actual NUMERIC(12,2),
        prediccion   NUMERIC(12,2),
        variacion    NUMERIC(6,2),
        confianza    VARCHAR(10),
        periodo      VARCHAR(20),
        created_at   TIMESTAMP    DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS metricas_diarias (
        id              SERIAL PRIMARY KEY,
        fecha           DATE UNIQUE DEFAULT CURRENT_DATE,
        ventas_total    NUMERIC(12,2) DEFAULT 0,
        transacciones   INTEGER      DEFAULT 0,
        eficiencia      NUMERIC(5,2) DEFAULT 0,
        created_at      TIMESTAMP    DEFAULT NOW()
      );
    `);

    // Insertar datos de ejemplo si están vacías
    const { rows } = await client.query('SELECT COUNT(*) FROM ventas');
    if (parseInt(rows[0].count) === 0) {
      await client.query(`
        INSERT INTO ventas (producto, canal, monto, fecha) VALUES
          ('Electrónica',  'Web',    42300, CURRENT_DATE - 30),
          ('Electrónica',  'App',    38100, CURRENT_DATE - 25),
          ('Electrónica',  'Web',    45200, CURRENT_DATE - 20),
          ('Hogar',        'B2B',    31800, CURRENT_DATE - 30),
          ('Hogar',        'Web',    29400, CURRENT_DATE - 15),
          ('Software',     'API',    28500, CURRENT_DATE - 30),
          ('Software',     'Web',    31200, CURRENT_DATE - 10),
          ('Servicios',    'Tienda', 19700, CURRENT_DATE - 30),
          ('Accesorios',   'App',    14200, CURRENT_DATE - 30),
          ('Electrónica',  'Web',    52100, CURRENT_DATE - 5),
          ('Hogar',        'App',    35600, CURRENT_DATE - 3),
          ('Software',     'Web',    33400, CURRENT_DATE - 1);

        INSERT INTO predicciones (producto, venta_actual, prediccion, variacion, confianza, periodo) VALUES
          ('Electrónica',  42300, 56100, 32.6,  'alta',  'Próximos 30d'),
          ('Hogar',        31800, 38400, 20.8,  'alta',  'Próximos 30d'),
          ('Software',     28500, 34200, 20.0,  'media', 'Próximos 30d'),
          ('Servicios',    19700, 21300,  8.1,  'media', 'Próximos 30d'),
          ('Accesorios',   14200, 13800, -2.8,  'baja',  'Próximos 30d');

        INSERT INTO metricas_diarias (fecha, ventas_total, transacciones, eficiencia)
        SELECT
          CURRENT_DATE - (generate_series(0,11))::integer,
          (30000 + random() * 50000)::numeric(12,2),
          (100 + random() * 200)::integer,
          (80 + random() * 18)::numeric(5,2);
      `);
    }

    console.log('✅ Base de datos inicializada correctamente');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
