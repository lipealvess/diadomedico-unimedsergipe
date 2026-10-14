# GLPI 100271 — Presença e Sorteio · Dia do Médico (24/10, Hotel Celi)

Site estático (HTML + JS puro, sem build). Bibliotecas ficam locais em `vendor/`, então funciona sem internet depois de aberto.

## Telas
- **Importar lista**: Excel/CSV com colunas `NOME`, `CRM`, `DATA DE NASCIMENTO` (botão "Baixar modelo").
- **Presença**: médico digita o CRM + Enter → aparece o nome completo e o mês do sorteio dele. Tem "Não sou eu — desfazer".
- **Presentes**: lista com busca/filtro por mês, remoção de presença e exportação CSV (inclui ganhadores).
- **Sorteio**: escolhe o mês → palco em tela cheia → roleta de nomes, fogos, balões e fanfarra.
  Só concorrem presentes aniversariantes do mês. O resultado é gravado antes da animação (recarregar não "re-sorteia").
  "Sortear outro" exclui o ganhador atual daquele mês (ex.: foi embora).

## Dados (LGPD)
A lista **não vai para o servidor**: fica no `localStorage` do navegador do computador do evento.
- Não suba a planilha para o GitHub.
- Use **um único computador** para presença e sorteio (pode abrir duas janelas: uma na recepção/notebook e outra no telão — elas se sincronizam).
- Não limpe os dados do navegador nem use aba anônima no dia. Exporte o CSV de presentes ao final.
- Depois dos testes, use "Zerar presenças e sorteios".

## Publicar (grátis)
**Vercel**: `npx vercel deploy --prod` (ou importar este repositório em vercel.com/new).
**GitHub Pages**: criar repositório, Settings → Pages → Branch `main` / root.
Também abre direto com duplo clique em `index.html`.

## Teste
`node test.js` (regras de importação e sorteio).
