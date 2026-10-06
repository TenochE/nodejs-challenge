const express = require("express");
const pool = require("../db");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken);

router.post("/", async (req, res) => {
    try {
        const {
            student_id,
            subject_id,
            advisor_id = null,
            topic,
            description,
            requested_at = null,
            status = "pending"
        } = req.body;

        const finalStudentId = student_id || req.user.id;

        if (!subject_id || !topic || !description) {
            return res.status(400).json({
                error: "subject_id, topic y description son obligatorios"
            });
        }

        const validStatuses = [
            "pending",
            "scheduled",
            "completed",
            "cancelled"
        ];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: "Estado inválido"
            });
        }

        const result = await pool.query(
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
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            `,
            [
                finalStudentId,
                subject_id,
                advisor_id,
                topic,
                description,
                requested_at,
                status
            ]
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === "23503") {
            return res.status(400).json({
                error: "Usuario, materia o asesor no válido"
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
                c.id,
                c.student_id,
                u.name AS student_name,
                c.subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                c.advisor_id,
                a.name AS advisor_name,
                c.topic,
                c.description,
                c.requested_at,
                c.status,
                c.created_at,
                c.updated_at
            FROM consultations c
            INNER JOIN users u
                ON u.id = c.student_id
            INNER JOIN subjects s
                ON s.id = c.subject_id
            LEFT JOIN users a
                ON a.id = c.advisor_id
            ORDER BY c.id
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

router.get("/:id", async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                c.id,
                c.student_id,
                u.name AS student_name,
                c.subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                c.advisor_id,
                a.name AS advisor_name,
                c.topic,
                c.description,
                c.requested_at,
                c.status,
                c.created_at,
                c.updated_at
            FROM consultations c
            INNER JOIN users u
                ON u.id = c.student_id
            INNER JOIN subjects s
                ON s.id = c.subject_id
            LEFT JOIN users a
                ON a.id = c.advisor_id
            WHERE c.id = $1
            `,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Asesoría no encontrada"
            });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Error interno del servidor"
        });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const {
            student_id,
            subject_id,
            advisor_id,
            topic,
            description,
            requested_at,
            status
        } = req.body;

        const currentResult = await pool.query(
            "SELECT * FROM consultations WHERE id = $1",
            [req.params.id]
        );

        if (currentResult.rows.length === 0) {
            return res.status(404).json({
                error: "Asesoría no encontrada"
            });
        }

        const current = currentResult.rows[0];

        const validStatuses = [
            "pending",
            "scheduled",
            "completed",
            "cancelled"
        ];

        const finalStatus = status ?? current.status;

        if (!validStatuses.includes(finalStatus)) {
            return res.status(400).json({
                error: "Estado inválido"
            });
        }

        const result = await pool.query(
            `
            UPDATE consultations
            SET
                student_id = $1,
                subject_id = $2,
                advisor_id = $3,
                topic = $4,
                description = $5,
                requested_at = $6,
                status = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
            `,
            [
                student_id ?? current.student_id,
                subject_id ?? current.subject_id,
                advisor_id === undefined
                    ? current.advisor_id
                    : advisor_id,
                topic ?? current.topic,
                description ?? current.description,
                requested_at === undefined
                    ? current.requested_at
                    : requested_at,
                finalStatus,
                req.params.id
            ]
        );

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        if (error.code === "23503") {
            return res.status(400).json({
                error: "Referencia de usuario o materia inválida"
            });
        }

        console.error(error);

        return res.status(500).json({
            error: "Error interno del servidor"
        });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const result = await pool.query(
            `
            UPDATE consultations
            SET
                status = 'cancelled',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
            `,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Asesoría no encontrada"
            });
        }

        return res.status(200).json({
            message: "Asesoría cancelada",
            consultation: result.rows[0]
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Error interno del servidor"
        });
    }
});

module.exports = router;