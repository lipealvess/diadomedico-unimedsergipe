// node site/test.js
const assert = require('assert');
const L = require('./logic.js');

assert.deepStrictEqual(L.parseData('15/01/1970'), { d: 15, m: 1, y: 1970 });
assert.deepStrictEqual(L.parseData('1970-01-15'), { d: 15, m: 1, y: 1970 });
assert.deepStrictEqual(L.parseData(25583), { d: 15, m: 1, y: 1970 }); // serial Excel
assert.strictEqual(L.parseData('31/02/1980'), null);
assert.strictEqual(L.crm('CRM-SE 01234'), '1234');

const { medicos, erros } = L.importar([
  { 'Nome Completo': 'Ana Souza', 'CRM': '1234', 'Data de Nascimento': '10/01/1980' },
  { 'Nome Completo': 'Bruno Lima', 'CRM': '5678', 'Data de Nascimento': '22/01/1975' },
  { 'Nome Completo': 'Carla Dias', 'CRM': '9999', 'Data de Nascimento': '03/02/1990' },
  { 'Nome Completo': 'Sem Data', 'CRM': '1111', 'Data de Nascimento': '' },
]);
assert.strictEqual(medicos.length, 3);
assert.strictEqual(erros.length, 1);

const presentes = { 1234: 't', 9999: 't' }; // Bruno não veio
assert.deepStrictEqual(L.elegiveis(medicos, presentes, 1).map(m => m.nome), ['Ana Souza']);
assert.strictEqual(L.sortear(medicos, presentes, 1, [], n => 0).nome, 'Ana Souza');
assert.strictEqual(L.sortear(medicos, presentes, 1, ['1234'], n => 0), null); // já sorteada
assert.strictEqual(L.sortear(medicos, presentes, 3, [], n => 0), null);       // ninguém de março
assert.deepStrictEqual(L.elegiveis(medicos, presentes, 0, ['1234']).map(m => m.nome), ['Carla Dias']); // Diversos

console.log('ok');
