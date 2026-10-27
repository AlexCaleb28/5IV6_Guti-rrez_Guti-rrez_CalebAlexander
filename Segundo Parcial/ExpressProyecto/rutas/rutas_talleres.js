 const express = require('express');
const router = express.Router();


const talleresControlador = require('../Controlador/talleres_controlador');


router.get('/', talleresControlador.obtenerTalleres);
router.post('/', talleresControlador.crearTaller);

module.exports = router;