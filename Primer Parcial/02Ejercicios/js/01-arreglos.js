// 01-arreglos.js
// Métodos de arreglo más usados en JS/Node — practícalos sobre esta lista
// de talleres (misma forma que la API real de CECyT9). Completa cada TODO.

const talleres = [
  { nombre: 'Introducción a Python', instructor: 'Ing. María López', cupo: 25, inscritos: 25 },
  { nombre: 'Fundamentos de Redes', instructor: 'Ing. Carlos Ramírez', cupo: 30, inscritos: 18 },
  { nombre: 'Diseño de Bases de Datos', instructor: 'Ing. Ana Torres', cupo: 20, inscritos: 20 },
  { nombre: 'Desarrollo Web con JS', instructor: 'Ing. María López', cupo: 25, inscritos: 10 },
];

// TODO: forEach — imprime "- <nombre> (<inscritos>/<cupo>)" de cada taller
console.log("Aplicando un forEach para imprimir cada taller: ");
talleres.forEach((a) => console.log(`- ${a.nombre} (${a.inscritos}/${a.cupo})`));

// TODO: map — crea un arreglo `nombres` solo con los nombres de los talleres
console.log("Aplicando funcion Mao con solo Nombres");
const nombres = talleres.map((a) => a.nombre);
console.log(nombres);
// TODO: filter — crea un arreglo `llenos` con los talleres donde inscritos >= cupo
console.log("Aplicando la funcion Filter en los talleres");
const llenos = telleres.filter((a) => a.inscritos >= a.cupo);
console.log(llenos.map((a)=> a.nombre));
// TODO: find — encuentra el PRIMER taller impartido por 'Ing. María López'
const tallerMaria = tuArreglo.find(a => a.instructor === 'Ing. María López');
// TODO: reduce — calcula `totalInscritos`, la suma de inscritos de todos los talleres
const totalInscritos = tuArreglo.reduce((acc, a) => acc + a.inscritos, 0);
// TODO: filter + map encadenados — nombres de los talleres que SÍ tienen cupo disponible
const talleresConCupo = tuArreglo
  .filter(a => a.cupoDisponible) 
  .map(a => a.nombre);