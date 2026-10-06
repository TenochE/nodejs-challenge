const express = require("express");

const pool = require("../db");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken);

router.get("/consultations", async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                COUNT(*)::INTEGER AS total,
                COUNT(*) FILTER (
                    WHERE status = 'pending'
                )::INTEGER AS pending,
                COUNT(*) FILTER (
                    WHERE status = 'scheduled'
                )::INTEGER AS scheduled,
                COUNT(*) FILTER (
                    WHERE status = 'completed'
                )::INTEGER AS completed,
                COUNT(*) FILTER (
                    WHERE status = 'cancelled'
                )::INTEGER AS cancelled
            FROM consultations
            `
        );

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Error interno del servidor"
        });
    }
});

router.get("/subjects", async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                s.id,
                s.name,
                s.code,
                s.program,
                COUNT(c.id)::INTEGER AS total_consultations,
                COUNT(c.id) FILTER (
                    WHERE c.status = 'pending'
                )::INTEGER AS pending,
                COUNT(c.id) FILTER (
                    WHERE c.status = 'completed'
                )::INTEGER AS completed,
                COUNT(c.id) FILTER (
                    WHERE c.status = 'cancelled'
                )::INTEGER AS cancelled
            FROM subjects s
            LEFT JOIN consultations c
                ON c.subject_id = s.id
            GROUP BY
                s.id,
                s.name,
                s.code,
                s.program
            ORDER BY s.id
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

router.get("/students", async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                u.id,
                u.name,
                u.email,
                COUNT(c.id)::INTEGER AS total_consultations,
                COUNT(c.id) FILTER (
                    WHERE c.status = 'pending'
                )::INTEGER AS pending,
                COUNT(c.id) FILTER (
                    WHERE c.status = 'completed'
                )::INTEGER AS completed,
                COUNT(c.id) FILTER (
                    WHERE c.status = 'cancelled'
                )::INTEGER AS cancelled
            FROM users u
            LEFT JOIN consultations c
                ON c.student_id = u.id
            WHERE u.role = 'alumno'
            GROUP BY
                u.id,
                u.name,
                u.email
            ORDER BY u.id
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

module.exports = router;