// La aplicación de la demo. server.js la arranca; las pruebas la arrancan con otras configuraciones.
const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { crearModeloUsuarios } = require('./modelos/usuarios.modelo');

const NOMBRE_COOKIE = 'connect.sid';

// Pide al almacén (MySQL o memoria) todas las sesiones guardadas. Solo sirve para la tabla de diagnóstico.
function todasLasSesiones(almacen) {
  return new Promise((resolve, reject) => {
    const promesa = almacen.all((error, sesiones) => (error ? reject(error) : resolve(sesiones)));
    if (promesa && typeof promesa.then === 'function') promesa.then(resolve, reject);
  });
}

// El id completo de la sesión es secreto: en pantalla solo se muestran sus primeros 8 caracteres.
const idCorto = (id) => (id ? `${id.slice(0, 8)}…` : null);

function crearApp(config, pool) {
  const app = express();
  app.use(express.json());

  // El modelo es quien habla con la tabla usuarios.
  const usuarios = crearModeloUsuarios(pool);

  // Dónde se guardan las sesiones: en la tabla sessions de MySQL o en la memoria del proceso.
  const almacen =
    config.almacen === 'memoria'
      ? new session.MemoryStore()
      : new MySQLStore({ createDatabaseTable: false, clearExpired: false }, pool);
  app.locals.almacen = almacen;

  // Este middleware pone req.session en cada petición y manda la cookie connect.sid.
  app.use(
    session({
      name: NOMBRE_COOKIE,
      secret: process.env.SESSION_SECRET || 'secreto-solo-para-la-demo',
      store: almacen,
      resave: false,
      saveUninitialized: false, // no crea sesión ni cookie hasta que haya algo que guardar
      rolling: config.rolling === true,
      cookie: {
        maxAge: config.maxAgeMs,
        httpOnly: config.httpOnly !== false,
        sameSite: config.sameSite || 'lax',
        secure: false, // true solo cuando el sitio va con https
      },
    })
  );

  // La cookie puede seguir viva en el navegador aunque ya sea tarde: el SERVIDOR decide si la sesión venció.
  function vencida(sesion) {
    const desde = config.rolling ? sesion.ultimoUso : sesion.creada;
    return Date.now() - desde > config.maxAgeMs;
  }

  // 401: "no sé quién eres" (no hay sesión, o ya venció).
  function requiereSesion(req, res, next) {
    if (req.session.usuario && vencida(req.session)) {
      return req.session.destroy(() => {
        res.clearCookie(NOMBRE_COOKIE);
        res.status(401).json({ error: '401 · Tu sesión venció: vuelve a iniciar sesión' });
      });
    }
    if (!req.session.usuario) {
      return res.status(401).json({ error: '401 · No has iniciado sesión (o tu sesión ya venció)' });
    }
    req.session.ultimoUso = Date.now();
    next();
  }

  // 403: "sé quién eres, pero no puedes". Va SIEMPRE después de requiereSesion.
  function requiereRol(rol) {
    return (req, res, next) => {
      if (req.session.usuario.rol !== rol) {
        return res
          .status(403)
          .json({ error: `403 · Eres ${req.session.usuario.usuario}, pero esta ruta es solo para ${rol}` });
      }
      next();
    };
  }

  // ----- Rutas -----

  app.get('/api/config', (req, res) => res.json(config));

  app.post('/api/visita', (req, res) => {
    req.session.visitas = (req.session.visitas || 0) + 1;
    res.json({ visitas: req.session.visitas, sesion: idCorto(req.sessionID) });
  });

  app.post('/api/login', async (req, res, next) => {
    try {
      const { usuario, contrasena } = req.body || {};
      const datos = await usuarios.verificar(usuario, contrasena);
      // Mismo mensaje si el usuario no existe o si la contraseña está mal.
      if (!datos) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

      // Antes de regenerar, anotamos el id viejo y las visitas para no perderlas.
      const antes = req.session.visitas !== undefined ? idCorto(req.sessionID) : null;
      const visitas = req.session.visitas || 0;

      const guardar = () => {
        req.session.usuario = datos;
        req.session.visitas = visitas;
        req.session.creada = Date.now();
        req.session.ultimoUso = Date.now();
        req.session.save((error) => {
          if (error) return next(error);
          res.json({ usuario: datos, sesionAntes: antes, sesionDespues: idCorto(req.sessionID) });
        });
      };

      if (config.regenerarAlEntrar) {
        // Id nuevo al iniciar sesión: una cookie "plantada" por un atacante deja de servir.
        req.session.regenerate((error) => (error ? next(error) : guardar()));
      } else {
        guardar();
      }
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/logout', (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie(NOMBRE_COOKIE);
      res.json({ mensaje: 'Sesión cerrada: el servidor la borró' });
    });
  });

  app.get('/api/sesion', requiereSesion, (req, res) => {
    const desde = config.rolling ? req.session.ultimoUso : req.session.creada;
    res.json({
      usuario: req.session.usuario,
      sesion: idCorto(req.sessionID),
      expiraEnSegundos: Math.max(0, Math.round((desde + config.maxAgeMs - Date.now()) / 1000)),
    });
  });

  app.get('/api/perfil', requiereSesion, (req, res) => {
    req.session.visitas = (req.session.visitas || 0) + 1;
    res.json({
      mensaje: `Hola, ${req.session.usuario.nombre}`,
      rol: req.session.usuario.rol,
      visitas: req.session.visitas,
    });
  });

  // Primero requiereSesion (401), después requiereRol (403).
  app.get('/api/admin/reporte', requiereSesion, requiereRol('admin'), (req, res) => {
    res.json({ reporte: 'Talleres: 3 · Inscritos: 57 · Cupo libre: 18' });
  });

  // Solo para la clase: un servidor real nunca muestra esto.
  app.get('/api/diagnostico/sesiones', async (req, res, next) => {
    try {
      const sesiones = await todasLasSesiones(almacen);
      const lista = Object.entries(sesiones || {}).map(([id, s]) => ({
        sesion: idCorto(id),
        esLaTuya: id === req.sessionID,
        usuario: s.usuario ? s.usuario.usuario : 'sin iniciar sesión',
        visitas: s.visitas || 0,
        expira: s.cookie && s.cookie.expires,
      }));
      res.json({ almacen: config.almacen, sesiones: lista });
    } catch (error) {
      next(error);
    }
  });

  // La página (HTML, CSS y demo.js) la sirve el mismo servidor: por eso el navegador manda la cookie solo.
  app.use(express.static(path.join(__dirname, 'public')));

  // Cualquier otra ruta /api/... no existe.
  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  // Si algo truena, el cliente solo ve un mensaje genérico; el detalle queda en la terminal.
  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor' });
  });

  return app;
}

module.exports = { crearApp, NOMBRE_COOKIE };