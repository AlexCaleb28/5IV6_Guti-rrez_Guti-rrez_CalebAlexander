const db = require('../db-local');

class AsistenciaModelo {
    static async registrarAsistencia(datos) {
        const { taller_id, nombre_alumno, boleta } = datos;
        const [result] = await db.query(
            'INSERT INTO asistencia (taller_id, nombre_alumno, boleta) VALUES (?, ?, ?)',
            [taller_id, nombre_alumno, boleta]
        );
        return { id: result.insertId, ...datos };
    }

    static async obtenerAsistenciasPorTaller(taller_id) {
        const [rows] = await db.query('SELECT * FROM asistencia WHERE taller_id = ?', [taller_id]);
        return rows;
    }
}

module.exports = AsistenciaModelo;