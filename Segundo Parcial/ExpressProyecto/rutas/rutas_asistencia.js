const express = require('express');
const router = express.Router();
const asistenciaControlador = require('../Controlador/asistencia_controlador');

router.get('/', asistenciaControlador.obtenerAsistencias);
router.post('/', asistenciaControlador.registrarAsistencia);

module.exports = router;