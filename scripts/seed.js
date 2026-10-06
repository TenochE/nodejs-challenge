const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

dotenv.config();

async function seed() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL no está definida");
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const demoPassword = await bcrypt.hash("secret123", 10);
        const advisorPassword = await bcrypt.hash("secret123", 10);

        const demoUserResult = await client.query(
            `
            INSERT INTO users (
                name,
                email,
                password_hash,
                role,
                active
            )
            VALUES ($1, $2, $3, $4, TRUE)
            ON CONFLICT (email)
            DO UPDATE SET
                name = EXCLUDED.name,
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role,
                active = TRUE,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
            `,
            [
                "Usuario Demo",
                "demo@uaeh.edu.mx",
                demoPassword,
                "alumno"
            ]
        );

        const demoUserId = demoUserResult.rows[0].id;

        const advisorResult = await client.query(
            `
            INSERT INTO users (
                name,
                email,
                password_hash,
                role,
                active
            )
            VALUES ($1, $2, $3, $4, TRUE)
            ON CONFLICT (email)
            DO UPDATE SET
                name = EXCLUDED.name,
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role,
                active = TRUE,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
            `,
            [
                "Asesor Demo",
                "asesor@uaeh.edu.mx",
                advisorPassword,
                "asesor"
            ]
        );

        const advisorId = advisorResult.rows[0].id;

        const subjectResult = await client.query(
            `
            INSERT INTO subjects (
                name,
                code,
                program,
                active
            )
            VALUES ($1, $2, $3, TRUE)
            ON CONFLICT (code)
            DO UPDATE SET
                name = EXCLUDED.name,
                program = EXCLUDED.program,
                active = TRUE,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
            `,
            [
                "Programación Orientada a Objetos",
                "POO-101",
                "Ingeniería de Software"
            ]
        );

        const subjectId = subjectResult.rows[0].id;

        await client.query(
            `
            INSERT INTO consultations (
                student_id,
                subject_id,
                advisor_id,
                topic,
                description,
                requested_at,
                status
            )
            SELECT
                $1,
                $2,
                $3,
                $4,
                $5,
                CURRENT_TIMESTAMP,
                'pending'
            WHERE NOT EXISTS (
                SELECT 1
                FROM consultations
                WHERE student_id = $1
                  AND subject_id = $2
                  AND topic = $4
            )
            `,
            [
                demoUserId,
                subjectId,
                advisorId,
                "Dudas sobre programación orientada a objetos",
                "Solicitud de asesoría para resolver dudas sobre clases, herencia y polimorfismo."
            ]
        );

        await client.query("COMMIT");

        console.log("Seed ejecutado correctamente.");
        console.log("Usuario demo: demo@uaeh.edu.mx");
        console.log("Contraseña demo: secret123");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error durante el seed:", error.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

seed();