const express = require("express");

const pool = require("../db");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateToken, async (req, res) => {
    try {
        const {
            name,
            code,
            program,
            active = true
        } = req.body;

        if (!name || !code || !program) {
            return res.status(400).json({
                error: "name, code y program son obligatorios"
            });
        }

        const result = await pool.query(
            `
            INSERT INTO subjects (
                name,
                code,
                program,
                active
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *
            `,
            [
                name,
                code,
                program,
                active
            ]
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === "23505") {
            return res.status(400).json({
                error: "El código de materia ya existe"
            });
        }

        console.error(error);

        return res.status(500).json({
            error: "Error interno del servidor"
        });
    }
});

router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                id,
                name,
                code,
                program,
                active,
                created_at,
                updated_at
            FROM subjects
            ORDER BY id
            `
        );

        return res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Error interno del servidor"
        });
    }
});

router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const {
            name,
            code,
            program,
            active
        } = req.body;

        const currentResult = await pool.query(
            "SELECT * FROM subjects WHERE id = $1",
            [req.params.id]
        );

        if (currentResult.rows.length === 0) {
            return res.status(404).json({
                error: "Materia no encontrada"
            });
        }

        const current = currentResult.rows[0];

        const result = await pool.query(
            `
            UPDATE subjects
            SET
                name = $1,
                code = $2,
                program = $3,
                active = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
            `,
            [
                name ?? current.name,
                code ?? current.code,
                program ?? current.program,
                active ?? current.active,
                req.params.id
            ]
        );

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        if (error.code === "23505") {
            return res.status(400).json({
                error: "El código de materia ya existe"
            });
        }

        console.error(error);

        return res.status(500).json({
            error: "Error interno del servidor"
        });
    }
});

router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `
            DELETE FROM subjects
            WHERE id = $1
            RETURNING *
            `,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Materia no encontrada"
            });
        }

        return res.status(200).json({
            message: "Materia eliminada",
            subject: result.rows[0]
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Error interno del servidor"
        });
    }
});

module.exports = router;