const jwt = require("jsonwebtoken");

const JWT_SECRET =
    process.env.JWT_SECRET || "evaluation-secret-change-me";

function authenticateToken(req, res, next) {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Autenticación requerida"
        });
    }

    const token = authorization.substring(7);

    try {
        const user = jwt.verify(token, JWT_SECRET);

        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({
            error: "Token inválido o expirado"
        });
    }
}

module.exports = {
    authenticateToken,
    JWT_SECRET
};