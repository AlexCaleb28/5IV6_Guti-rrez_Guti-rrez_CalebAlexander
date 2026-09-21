// ==========================================
// 01-ARREGLOS 
// ==========================================
const talleres = [
  { nombre: 'Introducción a Python', instructor: 'Ing. María López', cupo: 25, inscritos: 25 },
  { nombre: 'Fundamentos de Redes', instructor: 'Ing. Carlos Ramírez', cupo: 30, inscritos: 18 },
  { nombre: 'Diseño de Bases de Datos', instructor: 'Ing. Ana Torres', cupo: 20, inscritos: 20 },
  { nombre: 'Desarrollo Web con JS', instructor: 'Ing. María López', cupo: 25, inscritos: 10 },
];

function pintarTabla(){
    const tbody = document.querySelector('#tabla-talleres tbody');
    if (!tbody) return;

    tbody.innerHTML = talleres.map((a) => `
        <tr>
            <td>${a.nombre}</td>
            <td>${a.instructor}</td>
            <td>${a.cupo}</td>
            <td>${a.inscritos}</td>
        </tr>
    `).join('');
}

pintarTabla();

const formArreglos = document.getElementById('form-arreglos');
const resultadoArreglos = document.getElementById('resultado-arreglo');
const selectOperacionArreglo = document.getElementById('operacion-arreglo');

if (formArreglos) {
    formArreglos.addEventListener('submit', (evento) => {
        evento.preventDefault();
        const operacion = selectOperacionArreglo.value;

        let resultado;

        switch(operacion){
            case 'forEach':
                resultado = talleres.map((a) => `- ${a.nombre} (${a.inscritos}/${a.cupo})`).join('\n');
                break;
            case 'map':
                resultado = talleres.map((a) => a.nombre).join(', ');
                break;
            case 'filter':
                resultado = talleres.filter((a) => a.inscritos >= a.cupo).map((a) => a.nombre).join(', ');
                break;
            case 'find':
                const tallerEncontrado = talleres.find((a) => a.instructor === 'Ing. María López');
                resultado = tallerEncontrado ? tallerEncontrado.nombre : 'No encontrado';
                break;
            case 'reduce':
                const totalInscritos = talleres.reduce((acc, a) => acc + a.inscritos, 0);
                resultado = `Total de inscritos: ${totalInscritos}`;
                break;
        }
        resultadoArreglos.textContent = resultado;
    });
}

// ==========================================
// 02-OBJETOS-JSON.JS
// ==========================================
console.log('--- Ejercicio 02: Objetos y JSON ---');

const tallerObj = {
  nombre: 'Introducción a Python',
  instructor: 'Ing. María López',
  cupo: 25,
  inscritos: 25,
};

// Object.keys
console.log('Keys:', Object.keys(tallerObj));

// Object.values
console.log('Values:', Object.values(tallerObj));

// Object.entries con for..of
for (const [clave, valor] of Object.entries(tallerObj)) {
  console.log(`${clave}: ${valor}`);
}

// JSON.stringify
const textoJson = JSON.stringify(tallerObj);
console.log('JSON String:', textoJson);

// JSON.parse
const objetoDeVuelta = JSON.parse(textoJson);
console.log('JSON Parse (nombre):', objetoDeVuelta.nombre);

// ==========================================
// 03-STRINGS-FECHAS.JS
// ==========================================
console.log('--- Ejercicio 03: Strings y Fechas ---');

const entrada = '  María López  ';

// trim
const entradaLimpia = entrada.trim();
console.log('Trim:', entradaLimpia);

// split
const partes = entradaLimpia.split(' ');
console.log('Split:', partes);

// includes
console.log('Includes @:', 'correo@cecyt9.ipn.mx'.includes('@'));

// replace / replaceAll
const fechaTexto = '05/09/2026';
console.log('Replace:', fechaTexto.replace('/', '-'));
console.log('ReplaceAll:', fechaTexto.replaceAll('/', '-'));

// template literals
const nombrePersona = 'María';
const cupoTaller = 25;
console.log(`${nombrePersona} se inscribió en un taller con cupo para ${cupoTaller} personas.`);

// Date función
function fechaDesdeTexto(textoFecha) {
  const [dia, mes, anio] = textoFecha.split('/');
  return new Date(anio, mes - 1, dia);
}

const miFecha = fechaDesdeTexto('05/09/2026');
console.log('toISOString:', miFecha.toISOString());
console.log('getDay:', miFecha.getDay());

// Diferencia de días
const hoy = new Date();
const diferenciaMs = Math.abs(miFecha - hoy);
const diferenciaDias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
console.log(`Diferencia de días con hoy: ${diferenciaDias}`);