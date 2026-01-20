const sql = require('mssql/msnodesqlv8');

(async () => {
  try {
    const pool = await sql.connect({
  connectionString: 
    'Driver={ODBC Driver 17 for SQL Server};' +
    'Server=tcp:SPHILSQL15,55003;' +           // no instance name here!
    'Database=SXC-GLO-PKPI-S1;' +
    'Trusted_Connection=Yes;' +
    'TrustServerCertificate=Yes;' +
    'Login Timeout=5;'
});

    const result = await pool.request().query('SELECT count(*) FROM [SXC-GLO-PKPI-S1].[ops_kpi].[customer]');
    console.log(result.recordset);
    await pool.close();
  } catch (err) {
    console.error('Connection failed:', err);
  }
})();