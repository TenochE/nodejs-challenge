const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const pool = require("../db");
const { authenticateToken, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role = "alumno"
        } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                error: "name, email y password son obligatorios"
            });
        }

        if (!["alumno", "asesor", "administrador"].includes(role)) {
            return res.status(400).json({
                error: "Rol inválido"
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `
            INSERT INTO users (
                name,
                email,
                password_hash,
                role
            )
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, email, role, active, created_at
            `,
            [
                name,
                email.toLowerCase().trim(),
                passwordHash,
                role
            ]
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === "23505") {
            return res.status(400).json({
                error: "El correo electrónico ya está registrado"
            });
        }

        console.error(error);

        return res.status(500).json({
            error: "Error interno del servidor"
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "email y password son obligatorios"
            });
        }

        const result = await pool.query(
            `
            SELECT
                id,
                name,
                email,
                password_hash,
                role,
                active
            FROM users
            WHERE email = $1
            `,
            [email.toLowerCase().trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: "Credenciales incorrectas"
            });
        }

        const user = result.rows[0];

        if (!user.active) {
            return res.status(401).json({
                error: "Usuario inactivo"
            });
        }

        const passwordValid = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordValid) {
            return res.status(401).json({
                error: "Credenciales incorrectas"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            {
                expiresIn: "2h"
            }
        );

        return res.status(200).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                active: user.active
            }
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Error interno del servidor"
        });
    }
});

router.get("/profile", authenticateToken, async (req, res) => {
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
            [req.user.id]
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

module.exports = router;