// npm i mssql msnodesqlv8
const sql = require('mssql/msnodesqlv8');

(async () => {
  let pool;
  try {
    pool = await sql.connect({
      connectionString:
        'Driver={ODBC Driver 17 for SQL Server};' +
        'Server=tcp:SPHILSQL15,55003;' +
        'Database=SXC-GLO-PKPI-S1;' +
        'Trusted_Connection=Yes;' +
        'TrustServerCertificate=Yes;' +
        'Login Timeout=5;'
    });

    // ✅ Query the full table
    const result = await pool.request().query(
      'SELECT * FROM [SXC-GLO-PKPI-S1].[ops_kpi].[customer];'
    );

    // recordset is an array of rows (objects)
    console.log( result.recordset.length);

    // Show the first 5 rows
    console.log(result.recordset.slice(0, 5));

    // If you want to loop over all rows:
    // result.recordset.forEach(row => console.log(row));

  } catch (err) {
    console.error('Query failed:', err?.message);
    console.error(err);
  } finally {
    await pool?.close();
  }
})();