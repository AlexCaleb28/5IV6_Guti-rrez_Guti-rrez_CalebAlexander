// Consultas a la tabla tokens_revocados (la "lista negra" de tokens JWT).
// Siempre con ? (consulta parametrizada), nunca pegando texto en el SQL.
function crearModeloTokens(pool) {
  // Guarda el jti del token para que el servidor ya no lo acepte.
  // "exp" viene en SEGUNDOS (así lo guarda el JWT), por eso FROM_UNIXTIME.
  // INSERT IGNORE: si el mismo token se revoca dos veces, no truena por la llave primaria.
  async function revocar(jti, usuario, exp) {
    await pool.query(
      'INSERT IGNORE INTO tokens_revocados (jti, usuario, expira) VALUES (?, ?, FROM_UNIXTIME(?))',
      [jti, usuario, exp]
    );
  }

  // ¿Este token está en la lista negra?
  async function estaRevocado(jti) {
    const [filas] = await pool.query('SELECT 1 FROM tokens_revocados WHERE jti = ?', [String(jti || '')]);
    return filas.length > 0;
  }

  // Para la ruta de diagnóstico: todo lo que hay en la lista negra.
  async function listar() {
    const [filas] = await pool.query(
      'SELECT jti, usuario, expira, revocado_en FROM tokens_revocados ORDER BY revocado_en DESC, jti'
    );
    return filas;
  }

  return { revocar, estaRevocado, listar };
}

module.exports = { crearModeloTokens };