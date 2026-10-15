const { MESES } = Logic;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const fmtData = n => `${String(n.d).padStart(2, '0')}/${String(n.m).padStart(2, '0')}/${n.y}`;
const fmtHora = iso => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
// shortcut: módulo tem viés desprezível para listas pequenas (< milhares)
const rand = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;

// ---------- estado (localStorage do navegador deste computador) ----------
const KEY = 'unimed-dia-medico-2026';
let st = carregar();
function carregar() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? { medicos: [], presentes: {}, sorteios: {} }; }
  catch { return { medicos: [], presentes: {}, sorteios: {} }; }
}
function salvar() {
  try { localStorage.setItem(KEY, JSON.stringify(st)); }
  catch (e) { alert('Não foi possível salvar no navegador: ' + e.message); }
}
// outra aba/janela (ex.: telão) alterou os dados
addEventListener('storage', e => { if (e.key === KEY) { st = carregar(); render(); } });

const medico = crm => st.medicos.find(m => m.crm === crm);
const vencedor = mes => medico((st.sorteios[mes] ?? []).at(-1));

// ---------- abas ----------
function abrirAba() {
  const aba = location.hash.slice(1) || (st.medicos.length ? 'presenca' : 'importar');
  document.querySelectorAll('main section').forEach(s => s.hidden = s.id !== 'tab-' + aba);
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('ativo', b.dataset.tab === aba));
  render();
  if (aba === 'presenca') $('#crm').focus();
}
document.querySelectorAll('nav button').forEach(b => b.onclick = () => location.hash = b.dataset.tab);
addEventListener('hashchange', abrirAba);

function render() { renderPresentes(); renderMeses(); }

// ---------- presença ----------
let limparResposta;
$('#form-crm').onsubmit = e => {
  e.preventDefault();
  const crm = Logic.crm($('#crm').value);
  $('#crm').value = '';
  if (!crm) return;
  const m = medico(crm), r = $('#resposta');
  clearTimeout(limparResposta);
  limparResposta = setTimeout(() => r.innerHTML = '', 9000);

  if (!m) {
    r.innerHTML = `<div class="boasvindas nao"><div class="nome">CRM ${esc(crm)} não encontrado</div>
      <div class="mes">Por favor, procure a equipe da recepção.</div></div>`;
    return;
  }
  const mes = `🎂 Você concorre ao sorteio dos aniversariantes de <b>${MESES[m.nasc.m - 1]}</b>!`;
  if (st.presentes[crm]) {
    r.innerHTML = `<div class="boasvindas ja"><div>Presença já registrada às ${fmtHora(st.presentes[crm])}</div>
      <div class="nome">${esc(m.nome)}</div><div class="mes">${mes}</div></div>`;
    return;
  }
  st.presentes[crm] = new Date().toISOString();
  salvar(); render();
  r.innerHTML = `<div class="boasvindas ok"><div>Bem-vindo(a)!</div><div class="nome">${esc(m.nome)}</div>
    <div class="mes">${mes}</div><p><button class="btn sec" id="nao-sou-eu">Não sou eu — desfazer</button></p></div>`;
  $('#nao-sou-eu').onclick = () => { delete st.presentes[crm]; salvar(); render(); r.innerHTML = ''; $('#crm').focus(); };
  confetti({ particleCount: 90, spread: 80, origin: { y: .7 }, colors: ['#ff4d6d', '#ff9f1c', '#ffd60a', '#3a86ff', '#8338ec', '#06d6a0'] });
};

// ---------- lista de presentes ----------
Logic.MESES.forEach((n, i) => $('#filtro-mes').add(new Option(n, i + 1)));
$('#busca').oninput = $('#filtro-mes').onchange = renderPresentes;

function renderPresentes() {
  const busca = Logic.norm($('#busca').value), mes = +$('#filtro-mes').value;
  const lista = st.medicos.filter(m => st.presentes[m.crm])
    .filter(m => (!mes || m.nasc.m === mes) && (!busca || Logic.norm(m.nome).includes(busca) || m.crm.includes(busca)))
    .sort((a, b) => st.presentes[b.crm].localeCompare(st.presentes[a.crm]));
  $('#qtd-presentes').textContent = Object.keys(st.presentes).length;
  $('#qtd-medicos').textContent = st.medicos.length;
  $('#lista-presentes').innerHTML = lista.map(m => `<tr><td>${esc(m.nome)}</td><td>${m.crm}</td>
    <td>${fmtData(m.nasc)}</td><td>${fmtHora(st.presentes[m.crm])}</td>
    <td><button class="x" data-crm="${m.crm}" title="Remover presença" aria-label="Remover presença">✕</button></td></tr>`).join('')
    || '<tr><td colspan="5" class="muted">Nenhum presente.</td></tr>';
}
$('#lista-presentes').onclick = e => {
  const crm = e.target.dataset.crm;
  if (crm && confirm(`Remover a presença de ${medico(crm).nome}?`)) { delete st.presentes[crm]; salvar(); render(); }
};

function baixar(nome, texto) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' }));
  a.download = nome; a.click(); URL.revokeObjectURL(a.href);
}
$('#exportar').onclick = () => {
  const ganhou = {};
  (st.sorteios[0] ?? []).forEach(crm => ganhou[crm] = 'Diversos');
  for (let m = 1; m <= 12; m++) { const v = vencedor(m); if (v) ganhou[v.crm] = MESES[m - 1]; }
  const linhas = st.medicos.filter(m => st.presentes[m.crm]).map(m =>
    [m.nome, m.crm, fmtData(m.nasc), new Date(st.presentes[m.crm]).toLocaleString('pt-BR'), ganhou[m.crm] ?? ''].join(';'));
  baixar('presentes-dia-do-medico.csv', ['NOME;CRM;NASCIMENTO;CHEGADA;GANHADOR SORTEIO DE', ...linhas].join('\r\n'));
};

// ---------- importação ----------
$('#modelo').onclick = () => baixar('modelo-medicos.csv', 'NOME;CRM;DATA DE NASCIMENTO\r\nMaria da Silva Exemplo;1234;15/01/1970\r\n');

$('#arquivo').onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const buf = await f.arrayBuffer();
    let wb;
    if (/\.csv$/i.test(f.name)) {
      // CSV salvo pelo Excel costuma vir em Windows-1252
      let txt;
      try { txt = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
      catch { txt = new TextDecoder('windows-1252').decode(buf); }
      wb = XLSX.read(txt, { type: 'string', raw: true });
    } else wb = XLSX.read(buf, { type: 'array' });
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true });
    const { medicos, erros } = Logic.importar(linhas);
    $('#import-erros').innerHTML = erros.map(esc).join('<br>');
    if (!medicos.length) { $('#import-status').textContent = 'Nenhum médico importado.'; return; }
    if (st.medicos.length && !confirm(`Substituir a lista atual (${st.medicos.length} médicos) por ${medicos.length} médicos?`)) return;
    st.medicos = medicos;
    salvar(); render();
    $('#import-status').innerHTML = `✅ <b>${medicos.length}</b> médicos importados` + (erros.length ? ` — ${erros.length} linha(s) com problema:` : '.');
  } catch (err) {
    $('#import-status').textContent = 'Erro ao ler o arquivo: ' + err.message;
  } finally { e.target.value = ''; }
};

$('#zerar').onclick = () => {
  if (!confirm('Apagar TODAS as presenças e resultados de sorteio?')) return;
  st.presentes = {}; st.sorteios = {};
  salvar(); render();
};

// ---------- sorteio: escolha do mês ----------
function renderMeses() {
  const nd = Logic.elegiveis(st.medicos, st.presentes, 0, st.sorteios[0]).length, jd = (st.sorteios[0] ?? []).length;
  $('#diversos').disabled = !nd;
  $('#diversos small').textContent = `${nd} presente(s) concorrendo` + (jd ? ` · ${jd} já sorteado(s)` : '');
  $('#meses').innerHTML = MESES.map((nome, i) => {
    const mes = i + 1, n = Logic.elegiveis(st.medicos, st.presentes, mes).length, v = vencedor(mes);
    return `<button class="mes-btn ${v ? 'feito' : ''}" data-mes="${mes}" ${!n && !v ? 'disabled' : ''}>
      <b>${nome}</b><small>${v ? '🏆 ' + esc(v.nome) : n + ' concorrendo'}</small></button>`;
  }).join('');
}
$('#meses').onclick = e => { const b = e.target.closest('[data-mes]'); if (b) abrirPalco(+b.dataset.mes); };
$('#diversos').onclick = () => abrirPalco(0);

// ---------- sorteio: palco ----------
let mesAtual, girando = false;

function abrirPalco(mes) {
  mesAtual = mes;
  // Diversos pode ser sorteado várias vezes: sempre abre pronto para um novo sorteio
  const n = Logic.elegiveis(st.medicos, st.presentes, mes, mes ? [] : st.sorteios[0]).length, v = mes ? vencedor(mes) : null;
  $('#palco-titulo').textContent = mes ? `Aniversariantes de ${MESES[mes - 1]} 🎂` : 'Sorteio Diversos 🎁';
  $('#palco-info').textContent = `${n} médico(s) presente(s) concorrendo`;
  $('#roleta').className = ''; $('#roleta').textContent = v ? '' : '???';
  $('#parabens').textContent = '';
  $('#btn-sortear').hidden = !!v;
  $('#btn-novo').hidden = !v;
  $('#palco').hidden = false;
  if (v) revelar(v, false);
}

function fecharPalco() {
  if (girando) return;
  $('#palco').hidden = true;
  if (document.fullscreenElement) document.exitFullscreen();
  render();
}

async function sortear() {
  if (girando) return;
  const excluir = st.sorteios[mesAtual] ?? [];
  const lista = Logic.elegiveis(st.medicos, st.presentes, mesAtual, excluir);
  const v = Logic.sortear(st.medicos, st.presentes, mesAtual, excluir, rand);
  if (!v) { $('#roleta').textContent = mesAtual ? 'Nenhum aniversariante disponível 😢' : 'Todos os presentes já foram sorteados 😢'; return; }
  // grava antes da animação: recarregar a página não permite "sortear de novo"
  st.sorteios[mesAtual] = [...excluir, v.crm];
  salvar();

  girando = true;
  $('#btn-sortear').hidden = $('#btn-novo').hidden = true;
  $('#parabens').textContent = '🥁 Rufem os tambores...';
  $('#roleta').className = 'girando';
  for (let t = 50; t < 450; t *= 1.1) {
    $('#roleta').textContent = lista[rand(lista.length)].nome;
    som(700 + rand(400), .04);
    await new Promise(r => setTimeout(r, t));
  }
  girando = false;
  revelar(v, true);
}

function revelar(v, festa) {
  const roleta = $('#roleta');
  roleta.className = 'vencedor';
  roleta.innerHTML = [...v.nome].map((c, i) =>
    c === ' ' ? ' ' : `<span class="letra" style="animation-delay:${(i * .06).toFixed(2)}s">${esc(c)}</span>`).join('');
  $('#parabens').textContent = `🎉 Parabéns! CRM ${v.crm} 🎉`;
  if (mesAtual) $('#btn-novo').hidden = false;
  else {
    $('#btn-sortear').hidden = false;
    $('#palco-info').textContent = `${Logic.elegiveis(st.medicos, st.presentes, 0, st.sorteios[0]).length} médico(s) ainda concorrendo`;
  }
  if (festa) { fanfarra(); fogos(); baloes(); }
}

function fogos() {
  const fim = Date.now() + 7000, cores = ['#ffc72c', '#00995d', '#ffffff', '#ff5e7e', '#7dd3fc'];
  const tiro = () => {
    confetti({ particleCount: 70, startVelocity: 35, spread: 360, ticks: 70, zIndex: 60, colors: cores,
      origin: { x: Math.random() * .8 + .1, y: Math.random() * .4 + .1 } });
    confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0, y: .8 }, zIndex: 60, colors: cores });
    confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1, y: .8 }, zIndex: 60, colors: cores });
    if (Date.now() < fim && !$('#palco').hidden) setTimeout(tiro, 280);
  };
  tiro();
}

function baloes() {
  for (let i = 0; i < 16; i++) {
    const b = document.createElement('div');
    b.className = 'balao';
    b.textContent = ['🎈', '🎉', '🎂', '🥳', '🎁'][i % 5];
    b.style.left = Math.random() * 95 + 'vw';
    b.style.animationDuration = 5 + Math.random() * 4 + 's';
    b.style.animationDelay = Math.random() * 2 + 's';
    $('#palco').append(b);
    b.onanimationend = () => b.remove();
  }
}

// ---------- som (Web Audio, sem arquivos) ----------
let ac;
function som(freq, dur, tipo = 'square', quando = 0) {
  try {
    ac ??= new AudioContext();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + quando;
    o.type = tipo; o.frequency.value = freq;
    g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
  } catch { /* navegador sem áudio: segue sem som */ }
}
const fanfarra = () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => som(f, i === 5 ? .8 : .18, 'triangle', i * .15));

$('#btn-sortear').onclick = sortear;
$('#btn-novo').onclick = () => {
  const v = vencedor(mesAtual);
  if (!confirm(`Sortear outro nome? ${v.nome} ficará fora deste mês (ex.: não está no salão).`)) return;
  $('#roleta').className = ''; $('#roleta').textContent = '???'; $('#parabens').textContent = '';
  sortear();
};
$('#btn-voltar').onclick = fecharPalco;
$('#btn-tela').onclick = () => document.fullscreenElement ? document.exitFullscreen() : $('#palco').requestFullscreen();
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#palco').hidden && !document.fullscreenElement) fecharPalco(); });

abrirAba();
