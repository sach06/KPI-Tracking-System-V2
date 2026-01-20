// server.js
const path = require('path');
const express = require('express');
const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

const app = express();

/* -------------------------------------------------------
   1) Serve the frontend (your HTML/CSS/JS)
      - You said the file lives at: kpi-app/src/index__test.html
      - If you later move it to kpi-app/public, just change staticDir.
-------------------------------------------------------- */
const staticDir = path.join(__dirname, '..', 'kpi-app', 'src');
app.use(express.static(staticDir));

/* -------------------------------------------------------
   2) Database connection (reuse a single pool)
      Uses ODBC Driver 17 + fixed TCP port + Windows auth
-------------------------------------------------------- */
const CONNECTION_STRING =
'Driver={ODBC Driver 17 for SQL Server};' +
'Server=tcp:SPHILSQL15,55003;' +           // no instance name here!
'Database=SXC-GLO-PKPI-S1;' +
'Trusted_Connection=Yes;' +
'TrustServerCertificate=Yes;' +
'Login Timeout=5;'

let poolPromise;
async function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect({ connectionString: CONNECTION_STRING });
  }
  return poolPromise;
}

/* -------------------------------------------------------
   3) API: fixed endpoint for the Customer table
      Returns rows from [ops_kpi].[customer]
-------------------------------------------------------- */
app.get('/api/customer', async (_req, res) => {
  try {
    console.log('👉 /api/customer hit');
    const pool = await getPool();
    console.log('✅ DB connected');
    const result = await pool.request().query(
      `SELECT TOP (12) * FROM [ops_kpi].[customer];`
    );
    console.log('✅ Query rows:', result.recordset.length);
    res.json({ rows: result.recordset || [] });
  } catch (e) {
    console.error('❌ Customer query error:', e.message);
    res.status(500).json({ error: 'Query failed', detail: e.message });
  }
});

/* -------------------------------------------------------
   3b) TEST INSERT: fire manually via URL
   - Hit /api/customer/test-insert once to add a row
-------------------------------------------------------- */
app.get('/api/customer/test-insert', async (_req, res) => {
  try {
    console.log('👉 /api/customer/test-insert hit');
    const pool = await getPool();

    // TODO: adjust column names to your real schema
    const result = await pool.request().query(`
      INSERT INTO [ops_kpi].[kpi_value_Test]
           ([metric_id]
           ,[entity_type_code]
           ,[entity_key]
       )
     VALUES
           (1,
            'Test',
            'Test');
    `);

    console.log('✅ Insert completed. rowsAffected:', result.rowsAffected);
    res.json({ ok: true, rowsAffected: result.rowsAffected });
  } catch (e) {
    console.error('❌ Insert error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* -------------------------------------------------------
   4) Catch-all route (Express 5 compatible)
      Serves your HTML so the page opens at /
-------------------------------------------------------- */
app.use((_req, res) => {
  res.sendFile(path.resolve(staticDir, 'index_test.html')); // <- your actual filename
});

/* -------------------------------------------------------
   5) Start server
-------------------------------------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server on http://localhost:${PORT}`);
});