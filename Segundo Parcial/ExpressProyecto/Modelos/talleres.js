const db = require('../db-local');

async function obtenerTalleres() {
    const [rows] = await db.query('SELECT * FROM talleres');
    return rows;
}

async function obtenerTallerPorId(id) {
    const [rows] = await db.query('SELECT * FROM talleres WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    
    const taller = rows[0];
    // Contar cuántos asistentes tiene registrados este taller
    const [asistentesRows] = await db.query('SELECT COUNT(*) as count FROM asistencia WHERE taller_id = ?', [id]);
    taller.asistentes = asistentesRows[0].count;
    
    return taller;
}

async function crearTaller(taller) {
    const { nombre, instructor, fecha, cupo, descripcion } = taller;
    const [result] = await db.query(
        'INSERT INTO talleres (nombre, instructor, fecha, cupo, descripcion) VALUES (?, ?, ?, ?, ?)',
        [nombre, instructor, fecha, cupo, descripcion || '']
    );
    return { id: result.insertId, ...taller };
}

module.exports = {
    obtenerTalleres,
    obtenerTallerPorId,
    crearTaller
};