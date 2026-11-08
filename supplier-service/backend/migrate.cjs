const fs = require('node:fs');
const { Client } = require('pg');

async function main() {
  const ssl = process.env.DB_SSL_CA_PATH
    ? { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf8'), rejectUnauthorized: true }
    : undefined;
  const client = new Client({ connectionString: process.env.SUPPLIER_DATABASE_URL, ssl });
  await client.connect();
  try {
    await client.query(fs.readFileSync('/app/schema.sql', 'utf8'));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
