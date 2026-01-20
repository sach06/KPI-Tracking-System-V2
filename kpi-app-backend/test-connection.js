require('dotenv').config();
const sql = require('mssql/msnodesqlv8');

const server = process.env.DB_SERVER || 'SPHILSQL15\\SQLTST153';
const port = process.env.DB_PORT || '55003';
const database = process.env.DB_DATABASE || 'SXC-GLO-PKPI-S1';

const connectionString = `Driver={ODBC Driver 17 for SQL Server};Server=${server},${port};Database=${database};Trusted_Connection=Yes;TrustServerCertificate=Yes;`;

console.log('Testing connection with string:', connectionString);

async function test() {
    try {
        const pool = await sql.connect({ connectionString });
        console.log('✅ Success! Connected to SQL Server.');
        const result = await pool.request().query('SELECT 1 as test');
        console.log('Query result:', result.recordset);
        await pool.close();
    } catch (err) {
        console.error('❌ Connection failed:');
        console.error(err);
    }
}

test();
