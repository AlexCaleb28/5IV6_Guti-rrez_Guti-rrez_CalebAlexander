// La página solo hace fetch a la API. El navegador manda la cookie solo (misma página, mismo servidor).
// El script está al final del body, entonces ya existen todos los elementos cuando corre.
const $ = (id) => document.getElementById(id);

// Etapa 1: función para llamar a la API, la usamos en todas las peticiones.
// fetch no marca error con 401 o 403, el código lo sacamos de respuesta.status.
// No necesitamos credentials: 'include' porque la página y la API están en el mismo servidor.
// JWT: si le pasamos un token lo mandamos en el encabezado Authorization.
async function llamar(metodo, url, cuerpo, token) {
  const opciones = { method: metodo, headers: {} };
  if (token) opciones.headers.Authorization = `Bearer ${token}`;
  // Si hay cuerpo mandamos el Content-Type para que express.json() lo pueda leer.
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }
  let respuesta;
  try {
    respuesta = await fetch(url, opciones);
  } catch {
    // Validación: si el servidor está apagado regresamos código 0 para que no truene la página.
    return { status: 0, datos: { error: 'No hay conexión con el servidor (¿está corriendo npm start?)' } };
  }
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null; // Si no viene JSON lo dejamos en null.
  }
  return { status: respuesta.status, datos };
}

// Etapa 2: la bitácora.
// Elegimos el color según el código de respuesta.
function claseDelCodigo(status) {
  if (status >= 200 && status < 300) return 'codigo ok';
  if (status === 401) return 'codigo e401';
  if (status === 403) return 'codigo e403';
  return 'codigo error';
}

// Agregamos cada respuesta arriba con prepend.
// Usamos textContent y no innerHTML para evitar XSS (que metan un script).
// JWT: idLista sirve para escribir en la bitácora de la sección 6.
function anotar(metodo, url, status, datos, idLista = 'bitacora') {
  const lista = $(idLista);
  if (!lista) return;

  const li = document.createElement('li');

  const codigo = document.createElement('span');
  codigo.className = claseDelCodigo(status);
  codigo.textContent = status;

  const ruta = document.createElement('span');
  ruta.textContent = ` ${metodo} ${url}`;

  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(datos, null, 2);

  li.append(codigo, ruta, pre);
  lista.prepend(li);

  // Validación: solo dejamos las últimas 30 para que la página no se haga lenta.
  while (lista.children.length > 30) lista.lastElementChild.remove();
}

// Validación: revisamos el formulario antes de mandarlo al servidor.
function validarFormulario(usuario, contrasena) {
  if (usuario.trim() === '') return 'Escribe un usuario';
  if (contrasena === '') return 'Escribe la contraseña';
  if (usuario.length > 30) return 'El usuario es demasiado largo';
  if (contrasena.length > 100) return 'La contraseña es demasiado larga';
  return null;
}

// Validación: desactivamos los botones mientras responde el servidor para que no le piquen muchas veces.
function bloquearBotones(bloquear) {
  document.querySelectorAll('button').forEach((b) => { b.disabled = bloquear; });
}

// Etapa 3: el estado, le preguntamos al servidor si tenemos sesión.
async function pintarEstado() {
  const { status, datos } = await llamar('GET', '/api/sesion');
  const estado = $('estado');
  if (estado) {
    if (status === 200 && datos && datos.usuario) {
      const u = datos.usuario;
      estado.textContent = `Con sesión: ${u.nombre} (${u.rol}) · sesión ${datos.sesion} · vence en ${datos.expiraEnSegundos} s`;
      estado.className = 'estado con-sesion';
    } else {
      estado.textContent = `Sin sesión (el servidor responde ${status})`;
      estado.className = 'estado sin-sesion';
    }
  }
  // Con httpOnly en true sale vacío porque JavaScript no puede leer la cookie.
  const cookieJs = $('cookie-js');
  if (cookieJs) cookieJs.textContent = document.cookie || '(vacío)';
}

// Etapa 4: la tabla de sesiones que guarda el servidor.
// Primero vaciamos el tbody para que no se dupliquen las filas.
async function pintarTabla() {
  const { status, datos } = await llamar('GET', '/api/diagnostico/sesiones');
  const tbody = $('tabla-sesiones');
  if (!tbody) return;
  tbody.replaceChildren();

  const donde = $('donde');
  if (status !== 200 || !datos) {
    if (donde) donde.textContent = `No se pudo leer el diagnóstico (código ${status})`;
    agregarFilaVacia(tbody, '(no se pudo leer)');
    return;
  }

  if (donde) {
    donde.textContent = datos.almacen === 'memoria'
      ? 'En la MEMORIA del servidor (MemoryStore): se pierden al reiniciar'
      : 'En MySQL, tabla sessions (sobreviven a un reinicio)';
  }

  const sesiones = Array.isArray(datos.sesiones) ? datos.sesiones : [];
  if (sesiones.length === 0) {
    agregarFilaVacia(tbody, '(sin sesiones)');
    return;
  }

  for (const s of sesiones) {
    const tr = document.createElement('tr');
    if (s.esLaTuya) tr.className = 'tuya';
    const vence = s.expira ? new Date(s.expira).toLocaleTimeString() : '—';
    const celdas = [
      s.esLaTuya ? `${s.sesion} (la tuya)` : s.sesion,
      s.usuario ?? '—',
      String(s.visitas ?? 0),
      vence,
    ];
    for (const texto of celdas) {
      const td = document.createElement('td');
      td.textContent = texto;
      tr.append(td);
    }
    tbody.append(tr);
  }
}

// Fila de cuando no hay sesiones.
function agregarFilaVacia(tbody, texto) {
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = 4;
  td.textContent = texto;
  tr.append(td);
  tbody.append(tr);
}

// Refresca el estado y la tabla juntos.
async function refrescarTodo() {
  await pintarEstado();
  await pintarTabla();
}

// Etapa 5: los eventos.
// Formulario de login, preventDefault para que no se recargue la página.
$('form-login')?.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const usuarioEl = $('usuario');
  const contrasenaEl = $('contrasena');
  const cuerpo = {
    usuario: usuarioEl ? usuarioEl.value : '',
    contrasena: contrasenaEl ? contrasenaEl.value : '',
  };
  const problema = validarFormulario(cuerpo.usuario, cuerpo.contrasena);
  if (problema) {
    anotar('POST', '/api/login', '--', { error: `La página no lo mandó: ${problema}` });
    return;
  }
  bloquearBotones(true);
  try {
    const { status, datos } = await llamar('POST', '/api/login', cuerpo);
    anotar('POST', '/api/login', status, datos);
    await refrescarTodo();
  } finally {
    bloquearBotones(false);
  }
});

// Cuando cambia el usuario ponemos su contraseña de ejemplo.
$('usuario')?.addEventListener('change', () => {
  const usuarioEl = $('usuario');
  const contrasenaEl = $('contrasena');
  if (usuarioEl && contrasenaEl) {
    contrasenaEl.value = `${usuarioEl.value}12345`;
  }
});

// Recorremos todos los botones que tienen data-url; el método y la url los sacamos con dataset.
document.querySelectorAll('button[data-url]').forEach((boton) => {
  boton.addEventListener('click', async () => {
    const { metodo, url } = boton.dataset;
    bloquearBotones(true);
    try {
      const { status, datos } = await llamar(metodo || 'GET', url);
      anotar(metodo || 'GET', url, status, datos);
      await refrescarTodo();
    } finally {
      bloquearBotones(false);
    }
  });
});

$('btn-refrescar')?.addEventListener('click', refrescarTodo);
$('btn-sesiones')?.addEventListener('click', pintarTabla);

// ===================== JWT (semana 13) =====================
// El token lo guardamos en sessionStorage (se borra al cerrar la pestaña).
// Con JWT el navegador NO lo manda solo como la cookie; nosotros lo ponemos en cada petición.
let tokenJWT = sessionStorage.getItem('tokenJWT');

function guardarToken(token) {
  tokenJWT = token;
  if (token) sessionStorage.setItem('tokenJWT', token);
  else sessionStorage.removeItem('tokenJWT');
}

// El payload es la parte de en medio del token, viene en base64url y se puede leer sin el secreto.
function leerPayload(token) {
  try {
    const parte = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(parte), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

// Le preguntamos al servidor si el token sirve y mostramos sus datos.
async function pintarEstadoJWT() {
  const estado = $('estado-jwt');
  const jwtTokenEl = $('jwt-token');
  const jwtPayloadEl = $('jwt-payload');
  if (!estado) return;

  if (!tokenJWT) {
    estado.textContent = 'Sin token';
    estado.className = 'estado sin-sesion';
    if (jwtTokenEl) jwtTokenEl.textContent = '(sin token)';
    if (jwtPayloadEl) jwtPayloadEl.textContent = '(sin token)';
    return;
  }

  if (jwtTokenEl) jwtTokenEl.textContent = tokenJWT;
  if (jwtPayloadEl) jwtPayloadEl.textContent = JSON.stringify(leerPayload(tokenJWT), null, 2);

  const { status, datos } = await llamar('GET', '/api/jwt/sesion', undefined, tokenJWT);
  if (status === 200 && datos && datos.usuario) {
    const u = datos.usuario;
    estado.textContent = `Con token: ${u.nombre} (${u.rol}) · token ${datos.sesion || idCortoLocal(datos.jti)} · vence en ${datos.expiraEnSegundos} s`;
    estado.className = 'estado con-sesion';
  } else {
    estado.textContent = `Token NO válido: ${datos && datos.error ? datos.error : status}`;
    estado.className = 'estado sin-sesion';
  }
}

function idCortoLocal(id) {
  return id ? `${String(id).slice(0, 8)}…` : '—';
}

// Tabla de la lista negra (alineada con { revocacion, revocados: [{ jti, usuario, expira, revocadoEn }] }).
async function pintarTablaTokens() {
  const { status, datos } = await llamar('GET', '/api/diagnostico/tokens');
  const tbody = $('tabla-tokens');
  if (!tbody) return;
  tbody.replaceChildren();

  const revocarEl = $('jwt-revocar');
  if (status !== 200 || !datos) {
    if (revocarEl) revocarEl.textContent = `No se pudo leer la lista negra (código ${status})`;
    agregarFilaVacia(tbody, '(no se pudo leer)');
    return;
  }

  const revocacionActiva = Boolean(datos.revocacion ?? datos.revocar);
  if (revocarEl) {
    revocarEl.textContent = revocacionActiva
      ? 'jwtRevocar = true: al hacer logout el token se anota en MySQL (tabla tokens_revocados)'
      : 'jwtRevocar = false: el servidor no guarda nada, el token sirve hasta que venza';
  }

  const listaTokens = Array.isArray(datos.revocados)
    ? datos.revocados
    : Array.isArray(datos.tokens)
      ? datos.tokens
      : [];

  if (listaTokens.length === 0) {
    agregarFilaVacia(tbody, '(sin tokens revocados)');
    return;
  }

  const payloadActual = tokenJWT ? leerPayload(tokenJWT) : null;
  for (const t of listaTokens) {
    const tr = document.createElement('tr');
    const jtiMostrado = t.jti || '—';
    if (payloadActual?.jti && jtiMostrado.startsWith(String(payloadActual.jti).slice(0, 8))) {
      tr.className = 'tuya';
    }
    const revocadoFecha = t.revocadoEn || t.revocado_en;
    const celdas = [
      jtiMostrado.endsWith('…') ? jtiMostrado : `${jtiMostrado.slice(0, 8)}…`,
      t.usuario ?? '—',
      t.expira ? new Date(t.expira).toLocaleTimeString() : '—',
      revocadoFecha ? new Date(revocadoFecha).toLocaleTimeString() : '—',
    ];
    for (const texto of celdas) {
      const td = document.createElement('td');
      td.textContent = texto;
      tr.append(td);
    }
    tbody.append(tr);
  }
}

async function refrescarJWT() {
  await pintarEstadoJWT();
  await pintarTablaTokens();
}

// Botones de la sección 6.
document.querySelectorAll('button[data-jwt]').forEach((boton) => {
  boton.addEventListener('click', async () => {
    const accion = boton.dataset.jwt;

    if (accion === 'borrar') {
      guardarToken(null);
      anotar('--', 'sessionStorage', '--', { mensaje: 'Token borrado del navegador (el servidor no se entera)' }, 'bitacora-jwt');
      await refrescarJWT();
      return;
    }

    bloquearBotones(true);
    try {
      if (accion === 'login') {
        const cuerpo = {
          usuario: $('usuario') ? $('usuario').value : '',
          contrasena: $('contrasena') ? $('contrasena').value : '',
        };
        const { status, datos } = await llamar('POST', '/api/jwt/login', cuerpo);
        anotar('POST', '/api/jwt/login', status, datos, 'bitacora-jwt');
        if (status === 200 && datos && datos.token) guardarToken(datos.token);
      } else {
        const [metodo, url] = accion.split(' ');
        const { status, datos } = await llamar(metodo, url, undefined, tokenJWT);
        anotar(metodo, url, status, datos, 'bitacora-jwt');
        if (url === '/api/jwt/refresh' && status === 200 && datos && datos.token) guardarToken(datos.token);
      }
      await refrescarJWT();
    } finally {
      bloquearBotones(false);
    }
  });
});

$('btn-tokens')?.addEventListener('click', pintarTablaTokens);

// Etapa 6: al cargar la página mostramos la configuración y refrescamos todo.
async function iniciar() {
  const contrasenaEl = $('contrasena');
  if (contrasenaEl) contrasenaEl.maxLength = 100;
  const { status, datos } = await llamar('GET', '/api/config');
  const configEl = $('config');
  if (configEl && status === 200 && datos) {
    configEl.textContent = JSON.stringify(datos, null, 2);
  }
  await refrescarTodo();
  await refrescarJWT();
}

iniciar();