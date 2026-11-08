// Servidor local para testar os sites de contrato e de OS antes de publicar no Netlify.
// Uso: node teste-local/servidor.mjs   (Ctrl+C para parar)
//
// - Serve os arquivos direto das pastas lziphonescontrato/ e lziphonesos/ (sem copiar).
// - Os endereços de produção (lz-registros.netlify.app e api/os/numero) são trocados
//   só na resposta enviada ao navegador, então o código-fonte continua igual.
// - Contador da OS e registros ficam só na memória deste processo. Nada vai para o Netlify.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA || 8000);
const SITES = { contrato: 'lziphonescontrato', os: 'lziphonesos' };
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};
const REESCRITAS = [
  ['https://lz-registros.netlify.app/.netlify/functions/salvar', '/api/salvar'],
  ['api/os/numero', '/api/numero'],
];

let proximoNumero = 7;
const registros = [];

function enviarJson(res, status, corpo) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(corpo));
}

function lerCorpo(req) {
  return new Promise((resolver) => {
    let texto = '';
    req.on('data', (parte) => { texto += parte; });
    req.on('end', () => resolver(texto));
  });
}

async function rotaApi(req, res, caminho) {
  if (req.method === 'GET' && caminho === '/api/numero') {
    return enviarJson(res, 200, { proximo: proximoNumero });
  }
  if (req.method === 'POST' && caminho === '/api/numero') {
    return enviarJson(res, 200, { numero: proximoNumero++ });
  }
  if (req.method === 'POST' && caminho === '/api/salvar') {
    let corpo;
    try {
      corpo = JSON.parse(await lerCorpo(req));
    } catch {
      return enviarJson(res, 400, { erro: 'JSON inválido.' });
    }
    const registro = { id: corpo.idCliente, tipo: corpo.tipo, criadoEm: corpo.criadoEm, recebidoEm: new Date().toISOString(), dados: corpo.dados };
    const existente = registros.findIndex((r) => r.id === registro.id);
    if (existente >= 0) registros[existente] = registro;
    else registros.push(registro);
    console.log(`[salvar] ${registro.tipo} ${registro.id} (${registro.dados && registro.dados.nome ? registro.dados.nome : 'sem nome'})`);
    return enviarJson(res, 201, { ok: true, id: registro.id });
  }
  if (req.method === 'GET' && caminho === '/api/registros') {
    return enviarJson(res, 200, { total: registros.length, registros });
  }
  return enviarJson(res, 404, { erro: 'Rota de teste não encontrada.' });
}

function paginaInicial(res) {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><meta charset="utf-8"><title>Teste local</title>
    <h1>Teste local LZ iPhones</h1>
    <ul>
      <li><a href="/contrato/">Contrato</a></li>
      <li><a href="/os/">Ordem de serviço</a></li>
      <li><a href="/api/registros">Registros enviados (memória deste teste)</a></li>
    </ul>
    <p>Nada aqui vai para o Netlify. Os registros somem quando o servidor para.</p>`);
}

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const caminho = url.pathname;

  if (caminho.startsWith('/api/')) return rotaApi(req, res, caminho);
  if (caminho === '/') return paginaInicial(res);

  const partes = caminho.split('/').filter(Boolean);
  const pasta = SITES[partes[0]];
  if (!pasta) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('Não encontrado');
  }

  const base = path.join(RAIZ, pasta);
  const arquivo = path.join(base, partes.slice(1).join('/') || 'index.html');
  if (!arquivo.startsWith(base + path.sep) && arquivo !== base) {
    res.writeHead(403);
    return res.end('Proibido');
  }

  fs.readFile(arquivo, (erro, dados) => {
    if (erro) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('Não encontrado');
    }
    const ext = path.extname(arquivo);
    let corpo = dados;
    if (ext === '.js' || ext === '.html') {
      let texto = dados.toString('utf8');
      for (const [de, para] of REESCRITAS) texto = texto.split(de).join(para);
      corpo = Buffer.from(texto, 'utf8');
    }
    res.writeHead(200, { 'content-type': TIPOS[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(corpo);
  });
});

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log(`Teste local pronto:`);
  console.log(`  Contrato: http://localhost:${PORTA}/contrato/`);
  console.log(`  OS:       http://localhost:${PORTA}/os/`);
  console.log(`  Registros enviados: http://localhost:${PORTA}/api/registros`);
});
