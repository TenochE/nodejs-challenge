const express = require("express");
const bcrypt = require("bcryptjs");

const pool = require("../db");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken);

router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                id,
                name,
                email,
                role,
                active,
                created_at,
                updated_at
            FROM users
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

router.get("/:id", async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                id,
                name,
                email,
                role,
                active,
                created_at,
                updated_at
            FROM users
            WHERE id = $1
            `,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Usuario no encontrado"
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
            name,
            email,
            password,
            role,
            active
        } = req.body;

        const currentResult = await pool.query(
            "SELECT * FROM users WHERE id = $1",
            [req.params.id]
        );

        if (currentResult.rows.length === 0) {
            return res.status(404).json({
                error: "Usuario no encontrado"
            });
        }

        const current = currentResult.rows[0];

        const updatedName = name ?? current.name;
        const updatedEmail = email
            ? email.toLowerCase().trim()
            : current.email;
        const updatedRole = role ?? current.role;
        const updatedActive = active ?? current.active;

        if (
            !["alumno", "asesor", "administrador"].includes(
                updatedRole
            )
        ) {
            return res.status(400).json({
                error: "Rol inválido"
            });
        }

        let passwordHash = current.password_hash;

        if (password) {
            passwordHash = await bcrypt.hash(password, 10);
        }

        const result = await pool.query(
            `
            UPDATE users
            SET
                name = $1,
                email = $2,
                password_hash = $3,
                role = $4,
                active = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING
                id,
                name,
                email,
                role,
                active,
                created_at,
                updated_at
            `,
            [
                updatedName,
                updatedEmail,
                passwordHash,
                updatedRole,
                updatedActive,
                req.params.id
            ]
        );

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        if (error.code === "23505") {
            return res.status(400).json({
                error: "El correo ya pertenece a otro usuario"
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
            DELETE FROM users
            WHERE id = $1
            RETURNING id, name, email
            `,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Usuario no encontrado"
            });
        }

        return res.status(200).json({
            message: "Usuario eliminado",
            user: result.rows[0]
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Error interno del servidor"
        });
    }
});

module.exports = router;