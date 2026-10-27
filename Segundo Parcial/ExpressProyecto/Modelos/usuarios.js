const pool = require('../db-local');

const COLUMNAS_PUBLICAS = 'id, nombre, correo, boleta, rol';

//consultar todos los usuarios
async function listar() {
    const [filas] = await pool.query(´SELECT ${COLUMNAS_PUBLICAS} FROM usuarios ORDER BY id´)
    return filas;
}

//consultar por id

async function obtenerPorId() {
    const [filas] = await pool.query(´SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id = ?´, [id]
    )
    return filas[0];
}

//registrar un nuevo ususario

async function crear({nombre, correo, contrasenaHash, boleta, rol}) {
    const [info] = await pool.query()
}