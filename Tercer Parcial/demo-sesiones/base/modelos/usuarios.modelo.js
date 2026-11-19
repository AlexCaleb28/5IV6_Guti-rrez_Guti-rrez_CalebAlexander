// Consultas a la tabla usuarios. Siempre con ? (consulta parametrizada), nunca pegando texto en el SQL.
const bcrypt = require('bcryptjs');

function crearModeloUsuarios(pool) {
  // Regresa el usuario (sin el hash) si la contraseña es correcta, o null si no.
  async function verificar(usuario, contrasena) {
    // Si falta alguno de los dos datos, ni siquiera consultamos la base.
    if (typeof usuario !== 'string' || typeof contrasena !== 'string') return null;

    // 1) Buscar al usuario en la tabla. El ? se llena con el valor del arreglo.
    const [filas] = await pool.query(
      'SELECT id, usuario, nombre, rol, contrasena_hash FROM usuarios WHERE usuario = ?',
      [usuario]
    );

    // 2) Si no hay ninguna fila, ese usuario no existe.
    if (filas.length === 0) return null;
    const fila = filas[0];

    // 3) Comparar la contraseña escrita contra el hash guardado.
    const coincide = await bcrypt.compare(contrasena, fila.contrasena_hash);
    if (!coincide) return null;

    // 4) Devolver solo lo que se puede mostrar. El hash NO sale de aquí.
    return { id: fila.id, usuario: fila.usuario, nombre: fila.nombre, rol: fila.rol };
  }

  return { verificar };
}

module.exports = { crearModeloUsuarios };