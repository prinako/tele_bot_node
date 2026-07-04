import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
});

async function query(text, params = []) {
    return pool.query(text, params);
}

async function getClient() {
    return pool.connect();
}

async function closeDB() {
    await pool.end();
}

export {
    query,
    getClient,
    closeDB,
};
