const express = require('express');
const path = require('path');
const os = require('os');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const publico = (archivo) => path.join(__dirname, 'public', archivo);

app.use(express.json({ limit: '10kb' }));

// ---------- API (Conectado a tus archivos reales de la carpeta rutas) ----------
app.use('/api/usuarios', require('./rutas/rutas_usuarios')); 
app.use('/api/talleres', require('./rutas/rutas_talleres')); 
app.use('/api/asistencia', require('./rutas/rutas_asistencia')); 

app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'Ruta no encontrada.' }));

// ---------- Páginas estáticas ----------
app.get('/talleres', (req, res) => res.sendFile(publico('talleres.html')));
app.get('/talleres/alumnos/perfil', (req, res) => res.sendFile(publico('asistencia.html')));
app.get('/talleres/:id', (req, res) => res.sendFile(publico('taller.html')));
app.get('/alumnos/perfil', (req, res) => res.sendFile(publico('usuarios.html')));

// Mini-servidor auxiliar
const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
app.get('/mini-servidor/:id', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mini-servidor</title><link rel="stylesheet" href="/css/estilos.css"></head>
<body><nav id="nav"></nav>
<main><h1>Mini-servidor</h1>
<p>El parámetro capturado por Express es: ${escapar(req.params.id)}</p></main>
<script src="/js/comun.js"></script><script>pintarNav();</script></body></html>`);
});

app.use(express.static(publico('')));

// Manejo de errores JSON
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'El cuerpo de la petición no es un JSON válido.' });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Error interno del servidor.' });
});

// Arranque del servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nServidor listo:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  for (const lista of Object.values(os.networkInterfaces())) {
    for (const i of lista || []) {
      if (i.family === 'IPv4' && !i.internal) console.log(`  Red:    http://${i.address}:${PORT}`);
    }
  }
  console.log('');
});