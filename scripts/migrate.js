const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

async function migrate() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL no está definida");
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

    const client = await pool.connect();

    try {
        const migrationPath = path.join(
            __dirname,
            "..",
            "migrations",
            "001_initial.sql"
        );

        const sql = fs.readFileSync(migrationPath, "utf8");

        await client.query("BEGIN");
        await client.query(sql);
        await client.query("COMMIT");

        console.log("Migración ejecutada correctamente.");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error durante la migración:", error.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();