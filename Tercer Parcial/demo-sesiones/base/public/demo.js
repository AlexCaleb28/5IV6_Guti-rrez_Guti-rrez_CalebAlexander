// La página solo hace fetch a la API. El navegador manda la cookie solo (misma página, mismo servidor).
const $ = (id) => document.getElementById(id);

// ───────────────────────── Etapa 1 · Llamar a la API ─────────────────────────

// Una sola función para todas las peticiones: así el manejo del JSON y de los errores vive en un solo lugar
// y el resto del código solo pide "método + ruta" y recibe { status, datos }.
async function llamar(metodo, url, cuerpo) {
  const opciones = { method: metodo, headers: {} };

  // Content-Type solo cuando hay cuerpo: es lo que le avisa a express.json() que debe leer JSON.
  // Un GET no lleva cuerpo, así que no lo necesita.
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }

  // fetch NO lanza error con un 401 o un 403: son respuestas válidas del servidor. El código está en .status.
  // No hace falta credentials: 'include' porque la página y la API son del mismo origen (mismo servidor y
  // puerto): el navegador manda la cookie solo. Sí haría falta si la página viviera en otro origen
  // (por ejemplo Next.js en el puerto 3000 llamando a esta API en el 4600).
  const respuesta = await fetch(url, opciones);

  // Si la respuesta no es JSON, .json() truena; así datos queda en null en lugar de romper la página.
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null;
  }
  return { status: respuesta.status, datos };
}

// ───────────────────────── Etapa 2 · La bitácora ─────────────────────────

// Elige el color de la etiqueta con las clases que ya existen en estilos.css.
function claseDeCodigo(status) {
  if (status >= 200 && status < 300) return 'ok';
  if (status === 401) return 'e401';
  if (status === 403) return 'e403';
  return 'error';
}

// Agrega al PRINCIPIO de la bitácora lo que respondió el servidor, para ver lo más nuevo sin bajar.
// Se usa textContent y no innerHTML: el JSON puede traer texto escrito por alguien (un nombre, por ejemplo)
// y con innerHTML ese texto se ejecutaría como HTML (XSS). Con una cookie sin httpOnly, ese script
// podría leer document.cookie y robar la sesión.
function anotarEnBitacora(metodo, url, status, datos) {
  const item = document.createElement('li');

  const codigo = document.createElement('span');
  codigo.className = 'codigo ' + claseDeCodigo(status);
  codigo.textContent = status;

  const json = document.createElement('pre');
  json.textContent = JSON.stringify(datos, null, 2);

  item.append(codigo, ` ${metodo} ${url}`, json);
  $('bitacora').prepend(item);
}

// ───────────────────────── Etapa 3 · El estado ─────────────────────────

// Le pregunta al servidor quién soy. La respuesta (200 o 401) es la que decide el color y el texto:
// la página no "adivina" si hay sesión, el servidor es el que sabe.
async function actualizarEstado() {
  const { status, datos } = await llamar('GET', '/api/sesion');
  const caja = $('estado');

  if (status === 200) {
    caja.className = 'estado con-sesion';
    caja.textContent =
      `${datos.usuario.nombre} (${datos.usuario.rol}) · sesión ${datos.sesion} · vence en ${datos.expiraEnSegundos} s`;
  } else {
    caja.className = 'estado sin-sesion';
    caja.textContent = 'Sin sesión (el servidor responde 401)';
  }

  // Con httpOnly: true esto sale vacío aunque haya sesión: el JavaScript no puede leer esa cookie
  // (el navegador sí la sigue mandando en cada petición).
  $('cookie-js').textContent = document.cookie || '(vacío)';
}

// ───────────────────────── Etapa 4 · La tabla del servidor ─────────────────────────

// Muestra lo que el servidor guarda de cada sesión. Se vacía el tbody antes de llenarlo; si no,
// al pulsar dos veces las filas se duplicarían.
async function actualizarTabla() {
  const { status, datos } = await llamar('GET', '/api/diagnostico/sesiones');
  if (status !== 200) return;

  $('donde').textContent =
    datos.almacen === 'mysql'
      ? 'En MySQL, tabla sessions: sobreviven a un reinicio del servidor'
      : 'En la memoria del servidor: se pierden al reiniciarlo';

  const cuerpo = $('tabla-sesiones');
  cuerpo.replaceChildren();

  if (datos.sesiones.length === 0) {
    const fila = document.createElement('tr');
    const celda = document.createElement('td');
    celda.colSpan = 4;
    celda.textContent = '(sin sesiones)';
    fila.append(celda);
    cuerpo.append(fila);
    return;
  }

  for (const s of datos.sesiones) {
    const fila = document.createElement('tr');
    if (s.esLaTuya) fila.className = 'tuya';

    // expira llega como texto ISO; new Date lo convierte y toLocaleTimeString lo muestra en hora local.
    const vence = s.expira ? new Date(s.expira).toLocaleTimeString() : '—';
    const valores = [s.esLaTuya ? `${s.sesion} (la tuya)` : s.sesion, s.usuario, s.visitas, vence];

    for (const valor of valores) {
      const celda = document.createElement('td');
      celda.textContent = valor; // textContent: son datos que vienen del servidor
      fila.append(celda);
    }
    cuerpo.append(fila);
  }
}

// ───────────────────────── Etapa 5 · Los eventos ─────────────────────────

// Después de cada acción hay que volver a preguntar las dos cosas (estado y tabla); por eso van juntas.
async function refrescarTodo() {
  await actualizarEstado();
  await actualizarTabla();
}

// Formulario de login: preventDefault evita que el navegador recargue la página al enviar,
// porque la respuesta la queremos pintar con JavaScript.
$('form-login').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const cuerpo = { usuario: $('usuario').value, contrasena: $('contrasena').value };
  const { status, datos } = await llamar('POST', '/api/login', cuerpo);
  anotarEnBitacora('POST', '/api/login', status, datos);
  await refrescarTodo();
});

// Al cambiar de usuario se escribe su contraseña de ejemplo (<usuario>12345) para no teclearla.
$('usuario').addEventListener('change', () => {
  $('contrasena').value = $('usuario').value + '12345';
});

// Un solo recorrido para todos los botones de la tarjeta 3: el método y la ruta viven en el HTML
// (data-metodo y data-url), así que agregar un botón nuevo no obliga a tocar este código.
document.querySelectorAll('button[data-url]').forEach((boton) => {
  boton.addEventListener('click', async () => {
    const metodo = boton.dataset.metodo;
    const url = boton.dataset.url;
    const { status, datos } = await llamar(metodo, url);
    anotarEnBitacora(metodo, url, status, datos);
    await refrescarTodo();
  });
});

$('btn-refrescar').addEventListener('click', refrescarTodo);
$('btn-sesiones').addEventListener('click', actualizarTabla);

// ───────────────────────── Etapa 6 · Al cargar la página ─────────────────────────

// No hace falta esperar a DOMContentLoaded: el <script> está al final del <body>, así que todos los
// elementos ya existen cuando este código corre.
(async () => {
  const { datos } = await llamar('GET', '/api/config');
  $('config').textContent = JSON.stringify(datos, null, 2);
  await refrescarTodo();
})();