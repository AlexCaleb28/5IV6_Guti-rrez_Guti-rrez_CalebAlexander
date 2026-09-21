// 02-objetos-json.js
// Object.keys/values/entries y JSON.stringify/parse. Completa cada TODO.

const taller = {
  nombre: 'Introducción a Python',
  instructor: 'Ing. María López',
  cupo: 25,
  inscritos: 25,
};

// TODO: Object.keys — imprime solo los nombres de las propiedades de `taller`
console.log(Object.keys(taller));
// TODO: Object.values — imprime solo los valores
console.log(Object.values(taller));
// TODO: Object.entries — recorre con for..of e imprime "campo: valor" de cada propiedad
for (const [clave, valor] of Object.entries(taller)) {
  console.log(`${clave}: ${valor}`);
}
// TODO: JSON.stringify — convierte `taller` a texto (guárdalo en `textoJson`) e imprímelo
const textoJson = JSON.stringify(taller);
console.log(textoJson);
// TODO: JSON.parse — convierte `textoJson` de vuelta a objeto (guárdalo en `objetoDeVuelta`)
//       e imprime `objetoDeVuelta.nombre`
const objetoDeVuelta = JSON.parse(textoJson);
console.log(objetoDeVuelta.nombre);