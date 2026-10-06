const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const subjectsRoutes = require("./routes/subjects");
const consultationsRoutes = require("./routes/consultations");
const reportsRoutes = require("./routes/reports");

const app = express();

const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

app.get("/api/v1/health", (req, res) => {
    return res.status(200).json({
        status: "ok"
    });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/subjects", subjectsRoutes);
app.use("/api/v1/consultations", consultationsRoutes);
app.use("/api/v1/reports", reportsRoutes);

app.use("/api/v1", (req, res) => {
    return res.status(404).json({
        error: "Ruta no encontrada"
    });
});

app.use((err, req, res, next) => {
    console.error(err);

    return res.status(500).json({
        error: "Error interno del servidor"
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor ejecutándose en 0.0.0.0:${PORT}`);
});