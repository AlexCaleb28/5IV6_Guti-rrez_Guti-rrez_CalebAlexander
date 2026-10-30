const AsistenciaModelo = require('../Modelos/asistencia');

async function registrarAsistencia(req, res) {
    try {
        const { taller_id, nombre_alumno, boleta } = req.body;
        
        // Validación obligatoria (Paso 4.3 de la guía)
        if (!taller_id || !nombre_alumno || !boleta) {
            return res.status(400).json({ error: "taller_id, nombre_alumno y boleta son obligatorios" });
        }

        const nuevaAsistencia = await AsistenciaModelo.registrarAsistencia(req.body);
        res.status(201).json(nuevaAsistencia);
    } catch (error) {
        // Si el taller no existe, la llave foránea arroja error 500 (Paso 4.4)
        res.status(500).json({ error: error.message });
    }
}

async function obtenerAsistenciasPorTaller(req, res) {
    try {
        const { id } = req.params;
        const asistencias = await AsistenciaModelo.obtenerAsistenciasPorTaller(id);
        res.json(asistencias);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    registrarAsistencia,
    obtenerAsistenciasPorTaller
};