const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Choose driver: Default to native (Windows Auth) if no DB_USER is provided
const useNativeDriver = !process.env.DB_USER;
const sql = useNativeDriver ? require('mssql/msnodesqlv8') : require('mssql');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

/* -------------------------------------------------------
   Database connection (reuse a single pool)
   Supports both Windows Auth (local) and SQL Auth (Docker)
-------------------------------------------------------- */
if (useNativeDriver) {
  // Original Connection String for Windows Auth
  // We use the instance name and port provided by the user
  const server = process.env.DB_SERVER || 'SPHILSQL15\\SQLTST153';
  const port = process.env.DB_PORT || '55003';
  const database = process.env.DB_DATABASE || 'SXC-GLO-PKPI-S1';

  const CONTACT_STRING =
    'Driver={ODBC Driver 17 for SQL Server};' +
    `Server=${server},${port};` +
    `Database=${database};` +
    'Trusted_Connection=Yes;' +
    'TrustServerCertificate=Yes;' +
    'Login Timeout=30;';

  dbConfig = { connectionString: CONTACT_STRING };
  console.log('🔌 Using Native Driver (Windows Auth) for:', server);
} else {
  // Standard Configuration for SQL Auth (Docker/Linux)
  dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'SPHILSQL15\\SQLTST153',
    port: parseInt(process.env.DB_PORT || '55003'),
    database: process.env.DB_DATABASE || 'SXC-GLO-PKPI-S1',
    options: {
      encrypt: false, // Set to true if using Azure
      trustServerCertificate: true
    }
  };
  console.log('🔌 Using Standard Driver (SQL Auth) for:', dbConfig.server);
}

let poolPromise;
async function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig);
    poolPromise.then(() => {
      console.log('✅ Connected to SQL Server successfully!');
    }).catch(err => {
      console.error('❌ Database connection failed:', err);
      poolPromise = null;
    });
  }
  return poolPromise;
}

/* -------------------------------------------------------
   Login endpoint
-------------------------------------------------------- */
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    console.log('👉 /api/login hit for username:', username);
    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('password', sql.NVarChar, password)
      .query(`
        SELECT id, username, first_name, last_name, email, customer_name, is_active
        FROM [ops_kpi_user].[user_table]
        WHERE username = @username AND password_hash = @password AND is_active = 1
      `);

    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      res.json({
        success: true,
        user: { id: user.id, username: user.username, firstName: user.first_name, lastName: user.last_name, email: user.email, customerName: user.customer_name }
      });
      console.log('✅ User logged in:', username);
    } else {
      res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* -------------------------------------------------------
   Get Sites endpoint
-------------------------------------------------------- */
app.get('/api/sites', async (req, res) => {
  try {
    const username = req.query.username;
    if (!username) return res.status(400).json({ success: false, message: 'Username required' });

    console.log('👉 /api/sites for user:', username);
    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query(`
        SELECT DISTINCT uat.entity_name, uat.entity_type_code, uat.entity_key, uat.customer_name, 
                        uat.location, uat.equipment_type, uat.capacity, uat.strand_no, uat.commission_year, uat.oem_name
        FROM [ops_kpi_user].[user_access_table] uat
        INNER JOIN [ops_kpi_user].[user_table] ut ON uat.access_id = ut.access_id
        WHERE ut.username = @username AND uat.right_type = 'rw'
        ORDER BY uat.entity_type_code, uat.entity_name
      `);

    const sitesData = result.recordset.map(e => ({
      entity_key: e.entity_key, entity_name: e.entity_name, entity_type_code: e.entity_type_code,
      customer_name: e.customer_name, location: e.location, equipment_type: e.equipment_type,
      capacity: e.capacity, strand_no: e.strand_no, commission_year: e.commission_year, oem_name: e.oem_name
    }));

    res.json({ success: true, data: sitesData });
  } catch (err) {
    console.error('❌ Error fetching sites:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch sites', error: err.message });
  }
});

/* -------------------------------------------------------
   Get Entity Details endpoint
-------------------------------------------------------- */
app.get('/api/entity-details/:entityKey', async (req, res) => {
  try {
    const { entityKey } = req.params;
    const username = req.query.username;
    if (!username) return res.status(400).json({ success: false, message: 'Username required' });

    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('entityKey', sql.NVarChar, entityKey)
      .query(`
        SELECT uat.entity_name, uat.entity_type_code, uat.entity_key, uat.customer_name, uat.location,
               uat.equipment_type, uat.capacity, uat.strand_no, uat.commission_year, uat.oem_name
        FROM [ops_kpi_user].[user_access_table] uat
        INNER JOIN [ops_kpi_user].[user_table] ut ON uat.access_id = ut.access_id
        WHERE ut.username = @username AND uat.entity_key = @entityKey AND uat.right_type = 'rw'
      `);

    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Entity not found' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('❌ Error fetching entity details:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch entity details', error: err.message });
  }
});



/* -------------------------------------------------------
   Get ALL Historical KPI Data for Dashboard
   Load all data for an entity (no month/year filter)
-------------------------------------------------------- */
app.get('/api/kpi-historical-all', async (req, res) => {
  try {
    const username = req.query.username;
    const entityKey = req.query.entityKey;

    if (!username || !entityKey) {
      return res.status(400).json({ success: false, message: 'Username and entityKey required' });
    }

    console.log('👉 Loading ALL historical data for entity:', entityKey);
    const pool = await getPool();

    // Get ALL historical data for this entity (no time filtering)
    const result = await pool.request()
      .input('entityKey', sql.NVarChar, entityKey)
      .query(`
        SELECT km.metric_code, kv.scenario_code, kv.value_num, kv.unit_code, 
               kv.period_start, kv.period_end, YEAR(kv.period_start) as year, 
               MONTH(kv.period_start) as month
        FROM [ops_kpi].[kpi_value] kv
        INNER JOIN [ops_kpi].[kpi_metric] km ON kv.metric_id = km.metric_id
        WHERE kv.entity_key = @entityKey
        ORDER BY kv.period_start ASC, km.metric_code, kv.scenario_code
      `);

    console.log('✅ Found', result.recordset.length, 'total historical records for dashboard');

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('❌ Dashboard error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data', error: err.message });
  }
});

/* -------------------------------------------------------
   Get Historical KPI Data endpoint
-------------------------------------------------------- */
app.get('/api/historical-kpi/:entityKey/:year/:month', async (req, res) => {
  try {
    const { entityKey, year, month } = req.params;
    const username = req.query.username;
    if (!username) return res.status(400).json({ success: false, message: 'Username required' });

    const pool = await getPool();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNum = months.indexOf(month) + 1;

    const result = await pool.request()
      .input('entityKey', sql.NVarChar, entityKey)
      .input('year', sql.Int, year)
      .input('month', sql.Int, monthNum)
      .query(`
        SELECT km.metric_code, kv.scenario_code, kv.value_num, kv.unit_code, kv.period_start, kv.period_end
        FROM [ops_kpi].[kpi_value] kv
        INNER JOIN [ops_kpi].[kpi_metric] km ON kv.metric_id = km.metric_id
        WHERE kv.entity_key = @entityKey AND YEAR(kv.period_start) = @year AND MONTH(kv.period_start) = @month
        ORDER BY km.metric_code, kv.scenario_code
      `);

    console.log('✅ Found', result.recordset.length, 'KPI records');
    result.recordset.forEach(r => {
      console.log(`  - ${r.metric_code} (${r.scenario_code}): ${r.value_num}`);
    });

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('❌ Error fetching historical data:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch historical data', error: err.message });
  }
});

/* -------------------------------------------------------
   Get User Access endpoint
-------------------------------------------------------- */
app.get('/api/user-access/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const pool = await getPool();

    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query(`
        SELECT uat.entity_key, uat.entity_type_code, uat.entity_name, uat.right_type
        FROM [ops_kpi_user].[user_access_table] uat
        INNER JOIN [ops_kpi_user].[user_table] ut ON uat.access_id = ut.access_id
        WHERE ut.username = @username AND uat.right_type = 'rw'
        ORDER BY uat.entity_type_code, uat.entity_key
      `);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('❌ Error fetching user access:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch user access', error: err.message });
  }
});

/* -------------------------------------------------------
   Submit KPI data endpoint
-------------------------------------------------------- */
app.post('/api/submit-kpi', async (req, res) => {
  const { siteId, kpiData, username } = req.body;

  if (!kpiData || !Array.isArray(kpiData) || kpiData.length === 0) {
    return res.status(400).json({ success: false, message: 'No KPI data provided' });
  }

  try {
    console.log('👉 /api/submit-kpi for user:', username);
    const pool = await getPool();

    const accessResult = await pool.request()
      .input('username', sql.NVarChar, username)
      .query(`
        SELECT DISTINCT entity_key FROM [ops_kpi_user].[user_access_table]
        WHERE access_id = (SELECT access_id FROM [ops_kpi_user].[user_table] WHERE username = @username)
        AND right_type = 'rw'
      `);

    const allowedKeys = accessResult.recordset.map(r => r.entity_key);
    const unauthorized = kpiData.filter(item => !allowedKeys.includes(item.entity_key));

    if (unauthorized.length > 0) {
      return res.status(403).json({ success: false, message: 'Access denied to some assets' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      let inserted = 0, updated = 0;

      for (const item of kpiData) {
        const checkResult = await transaction.request()
          .input('metric_id', sql.Int, item.metric_id)
          .input('entity_key', sql.NVarChar, item.entity_key)
          .input('scenario_code', sql.NVarChar, item.scenario_code)
          .input('period_start', sql.Date, item.period_start)
          .query(`SELECT metric_id FROM [ops_kpi].[kpi_value]
                  WHERE metric_id = @metric_id AND entity_key = @entity_key 
                  AND scenario_code = @scenario_code AND period_start = @period_start`);

        if (checkResult.recordset.length > 0) {
          await transaction.request()
            .input('metric_id', sql.Int, item.metric_id)
            .input('entity_key', sql.NVarChar, item.entity_key)
            .input('scenario_code', sql.NVarChar, item.scenario_code)
            .input('period_start', sql.Date, item.period_start)
            .input('value_num', sql.Decimal(18, 2), item.value_num)
            .input('unit_code', sql.NVarChar, item.unit_code)
            .input('currency_code', sql.NVarChar, item.currency_code)
            .input('submitted_by', sql.NVarChar, item.submitted_by)
            .query(`UPDATE [ops_kpi].[kpi_value]
                    SET value_num = @value_num, unit_code = @unit_code, currency_code = @currency_code,
                        submitted_at = GETDATE(), submitted_by = @submitted_by
                    WHERE metric_id = @metric_id AND entity_key = @entity_key 
                    AND scenario_code = @scenario_code AND period_start = @period_start`);
          updated++;
        } else {
          await transaction.request()
            .input('metric_id', sql.Int, item.metric_id)
            .input('entity_type_code', sql.NVarChar, item.entity_type_code)
            .input('entity_key', sql.NVarChar, item.entity_key)
            .input('scenario_code', sql.NVarChar, item.scenario_code)
            .input('layer_code', sql.NVarChar, item.layer_code)
            .input('grain_code', sql.NVarChar, item.grain_code)
            .input('period_start', sql.Date, item.period_start)
            .input('period_end', sql.Date, item.period_end)
            .input('value_num', sql.Decimal(18, 2), item.value_num)
            .input('unit_code', sql.NVarChar, item.unit_code)
            .input('currency_code', sql.NVarChar, item.currency_code)
            .input('submitted_by', sql.NVarChar, item.submitted_by)
            .input('source_system', sql.NVarChar, 'SXC_KPI_TRACKER')
            .query(`INSERT INTO [ops_kpi].[kpi_value] 
                    (metric_id, entity_type_code, entity_key, scenario_code, layer_code, grain_code,
                     period_start, period_end, value_num, unit_code, currency_code, submitted_at, submitted_by, source_system)
                    VALUES (@metric_id, @entity_type_code, @entity_key, @scenario_code, @layer_code, @grain_code,
                            @period_start, @period_end, @value_num, @unit_code, @currency_code, GETDATE(), @submitted_by, @source_system)`);
          inserted++;
        }
      }

      await transaction.commit();
      res.json({ success: true, message: `${inserted + updated} data points submitted (${inserted} new, ${updated} updated)`, inserted, updated });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('❌ Error submitting KPI data:', err.message);
    res.status(500).json({ success: false, message: 'Failed to submit data: ' + err.message });
  }
});

/* -------------------------------------------------------
   Dashboard KPI endpoint - Load ALL historical data for selected asset
-------------------------------------------------------- */
app.get('/api/dashboard-kpi/:entityKey', async (req, res) => {
  try {
    const { entityKey } = req.params;
    const username = req.query.username;

    if (!username || !entityKey) {
      return res.status(400).json({ success: false, message: 'Username and entityKey required' });
    }

    console.log('👉 /api/dashboard-kpi for entity:', entityKey);
    const pool = await getPool();

    // Get entity name
    const entityResult = await pool.request()
      .input('entityKey', sql.NVarChar, entityKey)
      .query(`SELECT TOP 1 entity_name FROM [ops_kpi_user].[user_access_table] WHERE entity_key = @entityKey`);

    if (entityResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Entity not found' });
    }

    const entityName = entityResult.recordset[0].entity_name;

    // Get ALL historical data for this entity
    const kpiResult = await pool.request()
      .input('entityKey', sql.NVarChar, entityKey)
      .query(`
        SELECT km.metric_code, km.name as metric_name, kv.scenario_code, kv.value_num, 
               kv.period_start, YEAR(kv.period_start) as year, MONTH(kv.period_start) as month
        FROM [ops_kpi].[kpi_value] kv
        INNER JOIN [ops_kpi].[kpi_metric] km ON kv.metric_id = km.metric_id
        WHERE kv.entity_key = @entityKey AND kv.scenario_code = 'ACTUAL'
        ORDER BY kv.period_start ASC, km.metric_code
      `);

    if (kpiResult.recordset.length === 0) {
      return res.json({ success: true, data: { [entityKey]: { entityName, kpiCount: 0, timeline: [], categoryData: {} } } });
    }

    const data = kpiResult.recordset;
    const latestMonth = data[data.length - 1];
    const monthData = data.filter(d => d.year === latestMonth.year && d.month === latestMonth.month);

    // Build complete timeline with ALL data
    const timelineMap = {};
    data.forEach(item => {
      const monthKey = `${item.year}-${String(item.month).padStart(2, '0')}`;
      if (!timelineMap[monthKey]) timelineMap[monthKey] = [];
      timelineMap[monthKey].push(item.value_num || 0);
    });

    const timeline = Object.entries(timelineMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, values]) => ({
        month: monthKey,
        value: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
      }));

    // Build category data
    const categoryData = {};
    const categoryNames = { 'BUS': 'Business/Financial', 'TECH': 'Operational/Technical', 'BENCH': 'Benchmark', 'HSE': 'HSE' };

    monthData.forEach(item => {
      const category = item.metric_code?.split('_')[0] || 'OTHER';
      const categoryName = categoryNames[category] || category;
      if (!categoryData[categoryName]) categoryData[categoryName] = [];
      categoryData[categoryName].push({
        name: item.metric_name?.substring(0, 35) || item.metric_code,
        value: item.value_num || 0
      });
    });

    const dashboardData = {
      [entityKey]: {
        entityName: entityName,
        kpiCount: monthData.length,
        timeline: timeline,
        categoryData: categoryData
      }
    };

    console.log('✅ Dashboard data prepared for entity:', entityKey);
    res.json({ success: true, data: dashboardData });
  } catch (err) {
    console.error('❌ Dashboard error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data', error: err.message });
  }
});
/* -------------------------------------------------------
   Health check endpoint
-------------------------------------------------------- */
app.get('/api/health', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 as test');
    res.json({ status: 'OK', timestamp: new Date().toISOString(), database: 'Connected' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', timestamp: new Date().toISOString(), error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: SXC-GLO-PKPI-S1 @ SPHILSQL15,55003`);
});