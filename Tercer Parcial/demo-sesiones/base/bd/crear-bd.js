const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function crearBaseDeDatos(nombre = process.env.DB_NAME || 'demo_sesiones') {
  if (!/^[a-z0-9_]+$/i.test(nombre)) throw new Error(`Nombre de base inválido: ${nombre}`);
  const conexion = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    charset: 'utf8mb4',
  });
  try {
    const esquema = fs
      .readFileSync(path.join(__dirname, 'demo_sesiones.sql'), 'utf8')
      .replace(/^\s*(DROP DATABASE|CREATE DATABASE|USE)\b[^;]*;\s*$/gim, '');
    await conexion.query(`DROP DATABASE IF EXISTS \`${nombre}\``);
    await conexion.query(`CREATE DATABASE \`${nombre}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conexion.query(`USE \`${nombre}\``);
    await conexion.query(esquema);
  } finally {
    await conexion.end();
  }
  return nombre;
}

module.exports = { crearBaseDeDatos };

if (require.main === module) {
  crearBaseDeDatos()
    .then((nombre) => console.log(`Base de datos "${nombre}" creada con usuarios de ejemplo.`))
    .catch((error) => {
      console.error('No se pudo crear la base de datos:', error.message);
      console.error('Revisa que MySQL esté encendido y los datos de tu archivo .env');
      process.exit(1);
    });
}