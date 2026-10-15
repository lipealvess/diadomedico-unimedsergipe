// Regras do sistema (sem DOM) — usado pelo app.js e pelo test.js
const Logic = (() => {
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const crm = s => String(s ?? '').replace(/\D/g, '').replace(/^0+/, '');

  function data(d, m, y) {
    if (y < 100) y += y > 30 ? 1900 : 2000;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? { d, m, y } : null;
  }

  // aceita serial do Excel, dd/mm/aaaa, aaaa-mm-dd
  function parseData(v) {
    if (typeof v === 'number') {
      const dt = new Date(Math.round((v - 25569) * 864e5));
      return data(dt.getUTCDate(), dt.getUTCMonth() + 1, dt.getUTCFullYear());
    }
    const s = String(v ?? '').trim();
    let r;
    if ((r = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return data(+r[3], +r[2], +r[1]);
    if ((r = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/))) return data(+r[1], +r[2], +r[3]);
    return null;
  }

  // linhas = objetos {cabeçalho: valor} vindos da planilha
  function importar(linhas) {
    const medicos = new Map(), erros = [];
    if (!linhas.length) return { medicos: [], erros: ['Planilha vazia'] };
    const chaves = Object.keys(linhas[0]);
    const col = teste => chaves.find(k => teste(norm(k)));
    const cNome = col(k => k.includes('nome')), cCrm = col(k => k.includes('crm')),
      cNasc = col(k => k.includes('nasc')) ?? col(k => k.includes('data'));
    if (!cNome || !cCrm || !cNasc)
      return { medicos: [], erros: ['Cabeçalho precisa ter colunas NOME, CRM e DATA DE NASCIMENTO'] };

    linhas.forEach((l, i) => {
      const nome = String(l[cNome] ?? '').trim().replace(/\s+/g, ' '), c = crm(l[cCrm]), nasc = parseData(l[cNasc]);
      if (!nome && !c) return; // linha em branco
      if (!nome || !c || !nasc) return erros.push(`Linha ${i + 2}: ${nome || '(sem nome)'} — ${!c ? 'CRM inválido' : 'data de nascimento inválida'}`);
      if (medicos.has(c)) erros.push(`Linha ${i + 2}: CRM ${c} repetido (mantido o último)`);
      medicos.set(c, { crm: c, nome, nasc });
    });
    return { medicos: [...medicos.values()], erros };
  }

  // mes 0 = sorteio Diversos (todos os presentes)
  const elegiveis = (medicos, presentes, mes, excluir = []) =>
    medicos.filter(m => (mes === 0 || m.nasc.m === mes) && presentes[m.crm] && !excluir.includes(m.crm));

  // rand(n) -> inteiro em [0, n)
  function sortear(medicos, presentes, mes, excluir, rand) {
    const lista = elegiveis(medicos, presentes, mes, excluir);
    return lista.length ? lista[rand(lista.length)] : null;
  }

  return { MESES, norm, crm, parseData, importar, elegiveis, sortear };
})();

if (typeof module !== 'undefined') module.exports = Logic;
