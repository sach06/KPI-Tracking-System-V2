console.log('--- Environment Variables ---');
Object.keys(process.env).forEach(key => {
    if (key.startsWith('DB_')) {
        console.log(`${key}=${process.env[key]}`);
    }
});
console.log('-----------------------------');
