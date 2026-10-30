const TalleresModelo = require('../Modelos/talleres');

async function obtenerTalleres(req, res) {
    try {
        const talleres = await TalleresModelo.obtenerTalleres();
        res.json(talleres);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function obtenerTallerPorId(req, res) {
    try {
        const { id } = req.params;
        const taller = await TalleresModelo.obtenerTallerPorId(id);
        if (!taller) {
            return res.status(404).json({ error: "Taller no encontrado" });
        }
        res.json(taller);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function crearTaller(req, res) {
    try {
        const { nombre, fecha } = req.body;
        // Validación obligatoria según la guía
        if (!nombre || !fecha) {
            return res.status(400).json({ error: "nombre y fecha son obligatorios" });
        }
        const nuevoTaller = await TalleresModelo.crearTaller(req.body);
        res.status(201).json(nuevoTaller);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    obtenerTalleres,
    obtenerTallerPorId,
    crearTaller
};