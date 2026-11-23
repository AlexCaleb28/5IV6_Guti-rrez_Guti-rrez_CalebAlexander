// La aplicación de la demo. server.js la arranca; las pruebas la arrancan con otras configuraciones.
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const jwt = require('jsonwebtoken');
const { crearModeloUsuarios } = require('./modelos/usuarios.modelo');
const { crearModeloTokens } = require('./modelos/tokens.modelo');

const NOMBRE_COOKIE = 'connect.sid';

// Pide al almacén todas las sesiones. Según la versión responde con callback o con promesa.
function todasLasSesiones(almacen) {
  return new Promise((resolve, reject) => {
    const promesa = almacen.all((error, sesiones) => (error ? reject(error) : resolve(sesiones)));
    if (promesa && typeof promesa.then === 'function') promesa.then(resolve, reject);
  });
}

function crearApp(config, pool) {
  const app = express();
  app.use(express.json());

  // Los modelos son los que hablan con la base de datos.
  const usuarios = crearModeloUsuarios(pool);
  const tokens = crearModeloTokens(pool);

  // ¿Dónde vive la sesión? En la tabla sessions de MySQL o en la memoria del servidor.
  const almacen =
    config.almacen === 'memoria'
      ? new session.MemoryStore()
      : new MySQLStore({ createDatabaseTable: false, clearExpired: false }, pool);
  app.locals.almacen = almacen;

  app.use(
    session({
      name: NOMBRE_COOKIE,
      secret: process.env.SESSION_SECRET || 'secreto-solo-para-la-demo',
      store: almacen,
      resave: false,
      // false: no se crea sesión ni cookie hasta que guardemos algo en ella.
      saveUninitialized: false,
      rolling: config.rolling,
      cookie: {
        maxAge: config.maxAgeMs,
        httpOnly: config.httpOnly,
        sameSite: config.sameSite,
        secure: false,
      },
    })
  );

  // El id completo no se enseña: solo sus primeros 8 caracteres, para compararlos en pantalla.
  const cortoId = (id) => (id ? `${id.slice(0, 8)}…` : null);

  // ───────────────────────── Sesiones con cookie ─────────────────────────

  // El servidor decide si la sesión venció (no se fía de la cookie).
  // Con rolling cuenta desde el último uso; sin rolling, desde que se creó.
  function vencida(sesion) {
    const desde = config.rolling ? sesion.ultimoUso : sesion.creada;
    return Date.now() - desde > config.maxAgeMs;
  }

  // 401: no sé quién eres.
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

  // 403: sé quién eres, pero no puedes.
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

  app.get('/api/config', (req, res) => res.json(config));

  // Una visita sin login: guarda un contador en la sesión del servidor (esto crea la cookie).
  app.post('/api/visita', (req, res) => {
    req.session.visitas = (req.session.visitas || 0) + 1;
    res.json({ visitas: req.session.visitas, sesion: cortoId(req.sessionID) });
  });

  app.post('/api/login', async (req, res, next) => {
    try {
      const { usuario, contrasena } = req.body || {};
      const datos = await usuarios.verificar(usuario, contrasena);
      // Mismo mensaje si el usuario no existe o la contraseña es incorrecta.
      if (!datos) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

      // Si ya había una sesión (por ejemplo por una visita), se anota su id para compararlo después.
      const antes = req.session.visitas !== undefined ? cortoId(req.sessionID) : null;
      const visitas = req.session.visitas || 0;

      const guardar = () => {
        req.session.usuario = datos;
        req.session.visitas = visitas;
        req.session.creada = Date.now();
        req.session.ultimoUso = Date.now();
        req.session.save((error) => {
          if (error) return next(error);
          res.json({ usuario: datos, sesionAntes: antes, sesionDespues: cortoId(req.sessionID) });
        });
      };

      if (config.regenerarAlEntrar) {
        // Id nuevo al entrar: así una cookie "plantada" por un atacante no sirve (fijación de sesión).
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
      sesion: cortoId(req.sessionID),
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

  app.get('/api/admin/reporte', requiereSesion, requiereRol('admin'), (req, res) => {
    res.json({ reporte: 'Talleres: 3 · Inscritos: 57 · Cupo libre: 18' });
  });

  // Solo para la clase: lo que el servidor guarda de cada sesión.
  app.get('/api/diagnostico/sesiones', async (req, res, next) => {
    try {
      const sesiones = await todasLasSesiones(almacen);
      const lista = Object.entries(sesiones || {}).map(([id, s]) => ({
        sesion: cortoId(id),
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

  // ───────────────────────── JWT (token en el encabezado, sin cookie) ─────────────────────────

  const SECRETO_JWT = config.jwtSecreto || process.env.JWT_SECRET || 'secreto-jwt-solo-para-esta-demo';

  // El token lleva los datos del usuario + cuándo vence + una firma. El jti es su id único.
  function firmarToken(usuario) {
    return jwt.sign(
      { sub: String(usuario.id), usuario: usuario.usuario, nombre: usuario.nombre, rol: usuario.rol },
      SECRETO_JWT,
      { algorithm: 'HS256', expiresIn: config.jwtExpiraSeg || 300, jwtid: crypto.randomUUID() }
    );
  }

  // 401 si falta el token, es falso, ya expiró o está en la lista negra.
  async function requiereJWT(req, res, next) {
    const encabezado = req.headers.authorization || '';
    if (!encabezado.startsWith('Bearer ')) {
      return res.status(401).json({ error: '401 · Falta el token (Authorization: Bearer <token>)' });
    }
    const token = encabezado.slice('Bearer '.length);

    let datos;
    try {
      datos = jwt.verify(token, SECRETO_JWT, { algorithms: ['HS256'] });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: '401 · El token expiró: pide uno nuevo con el login' });
      }
      return res.status(401).json({ error: '401 · Token inválido' });
    }

    try {
      if (config.jwtRevocar && (await tokens.estaRevocado(datos.jti))) {
        return res.status(401).json({ error: '401 · Token revocado: ya se cerró la sesión' });
      }
    } catch (error) {
      return next(error);
    }

    req.jwt = datos;
    next();
  }

  // 403 con JWT: el rol viene dentro del token.
  function requiereRolJWT(rol) {
    return (req, res, next) => {
      if (req.jwt.rol !== rol) {
        return res.status(403).json({ error: `403 · Eres ${req.jwt.usuario}, pero esta ruta es solo para ${rol}` });
      }
      next();
    };
  }

  app.post('/api/jwt/login', async (req, res, next) => {
    try {
      const { usuario, contrasena } = req.body || {};
      const datos = await usuarios.verificar(usuario, contrasena);
      if (!datos) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

      res.json({ token: firmarToken(datos), usuario: datos });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/jwt/perfil', requiereJWT, (req, res) => {
    res.json({
      mensaje: `Hola, ${req.jwt.nombre}`,
      rol: req.jwt.rol,
      expiraEnSegundos: Math.max(0, req.jwt.exp - Math.floor(Date.now() / 1000)),
    });
  });

  app.get('/api/jwt/admin/reporte', requiereJWT, requiereRolJWT('admin'), (req, res) => {
    res.json({ reporte: 'Talleres: 3' });
  });

  app.post('/api/jwt/logout', requiereJWT, async (req, res, next) => {
    try {
      if (config.jwtRevocar) {
        await tokens.revocar(req.jwt.jti, req.jwt.usuario, req.jwt.exp);
        return res.json({ mensaje: 'Token revocado: se agregó a la lista negra', revocado: true });
      }
      res.json({ mensaje: 'El servidor no guarda nada: el token sigue sirviendo hasta que expire', revocado: false });
    } catch (error) {
      next(error);
    }
  });

  // Solo para la clase: la lista negra de tokens.
  app.get('/api/jwt/diagnostico', async (req, res, next) => {
    try {
      res.json({ revocar: config.jwtRevocar, revocados: await tokens.listar() });
    } catch (error) {
      next(error);
    }
  });

  // ───────────────────────── Al final: estáticos, 404 y errores ─────────────────────────
  // IMPORTANTE: todas las rutas /api van ANTES del 404, porque Express las revisa en orden.

  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor' });
  });

  return app;
}

module.exports = { crearApp, NOMBRE_COOKIE };