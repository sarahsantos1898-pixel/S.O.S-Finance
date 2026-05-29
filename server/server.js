/**
 * S.O.S-FINANCE — Backend Express + servidor estático do frontend
 *
 * Rode:
 *   npm install
 *   npm start
 *
 * Servirá:
 *   - API JSON em  /api/*
 *   - Frontend (build do Lovable) em  /
 * Tudo na mesma porta (sem CORS).
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(express.json({ limit: '1mb' }));

// ---------- "DB" em arquivo ----------
function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
function publicUser(u) {
  const { senha, codigoRecuperacao, ...rest } = u;
  return rest;
}
function findByEmail(email) {
  return loadUsers().find((u) => u.email.toLowerCase() === String(email).toLowerCase());
}
function updateUser(email, mutate) {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (idx === -1) return null;
  mutate(users[idx]);
  saveUsers(users);
  return users[idx];
}

// ---------- Rotas de autenticação ----------
app.post('/api/cadastrar', async (req, res) => {
  const { nome, email, senha } = req.body || {};
  if (!nome || !email || !senha)
    return res.status(400).json({ sucesso: false, mensagem: 'Dados incompletos' });
  if (senha.length < 6)
    return res.status(400).json({ sucesso: false, mensagem: 'Senha deve ter ao menos 6 caracteres' });
  if (findByEmail(email))
    return res.status(409).json({ sucesso: false, mensagem: 'E-mail já cadastrado' });

  const users = loadUsers();
  const novo = {
    id: Date.now(),
    nome,
    email,
    senha: await bcrypt.hash(senha, 10),
    saldo: 0,
    transacoes: [],
    cartoes: [],
    planejamentoMensal: { metaEconomia: 0, previsaoGastos: 0 },
    despesasFixas: {},
    metaInvestimento: { tipo: '', valor: 0 },
  };
  users.push(novo);
  saveUsers(users);
  res.json({ sucesso: true, usuario: publicUser(novo) });
});

app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body || {};
  const u = findByEmail(email);
  if (!u) return res.status(401).json({ sucesso: false, mensagem: 'Credenciais inválidas' });
  const ok = await bcrypt.compare(senha, u.senha);
  if (!ok) return res.status(401).json({ sucesso: false, mensagem: 'Credenciais inválidas' });
  res.json({ sucesso: true, usuario: publicUser(u) });
});

app.post('/api/recuperar-senha', (req, res) => {
  const { email } = req.body || {};
  const u = findByEmail(email);
  if (!u) return res.status(404).json({ sucesso: false, mensagem: 'E-mail não encontrado' });
  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  updateUser(email, (x) => (x.codigoRecuperacao = codigo));
  // Em produção: envie por e-mail. Aqui retornamos para teste.
  res.json({ sucesso: true, codigo });
});

app.post('/api/redefinir-senha', async (req, res) => {
  const { email, codigo, novaSenha } = req.body || {};
  const u = findByEmail(email);
  if (!u || u.codigoRecuperacao !== codigo)
    return res.status(400).json({ sucesso: false, mensagem: 'Código inválido' });
  const hash = await bcrypt.hash(novaSenha, 10);
  updateUser(email, (x) => {
    x.senha = hash;
    delete x.codigoRecuperacao;
  });
  res.json({ sucesso: true });
});

// ---------- Usuário ----------
app.get('/api/usuario/:email', (req, res) => {
  const u = findByEmail(req.params.email);
  if (!u) return res.status(404).json({ sucesso: false, mensagem: 'Não encontrado' });
  res.json({ sucesso: true, usuario: publicUser(u) });
});

// ---------- Transações ----------
app.post('/api/transacao', (req, res) => {
  const { email, tipo, descricao, valor, cartaoId } = req.body || {};
  if (!['entrada', 'saida'].includes(tipo))
    return res.status(400).json({ sucesso: false, mensagem: 'Tipo inválido' });
  const v = parseFloat(valor);
  if (!descricao || !(v > 0))
    return res.status(400).json({ sucesso: false, mensagem: 'Dados inválidos' });

  const now = new Date();
  const u = updateUser(email, (x) => {
    const tx = {
      id: Date.now(),
      tipo,
      descricao,
      valor: v,
      cartaoId: cartaoId ?? null,
      data: now.toISOString(),
      mes: now.getMonth() + 1,
      ano: now.getFullYear(),
    };
    x.transacoes.push(tx);
    x.saldo = (x.saldo || 0) + (tipo === 'entrada' ? v : -v);
    if (tipo === 'saida' && cartaoId) {
      const c = x.cartoes.find((c) => c.id === cartaoId);
      if (c) c.gasto = (c.gasto || 0) + v;
    }
  });
  if (!u) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado' });
  res.json({ sucesso: true, transacoes: u.transacoes, cartoes: u.cartoes, saldo: u.saldo });
});

app.delete('/api/transacao/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { email } = req.body || {};
  const u = updateUser(email, (x) => {
    const tx = x.transacoes.find((t) => t.id === id);
    if (!tx) return;
    x.transacoes = x.transacoes.filter((t) => t.id !== id);
    x.saldo = (x.saldo || 0) + (tx.tipo === 'entrada' ? -tx.valor : tx.valor);
    if (tx.tipo === 'saida' && tx.cartaoId) {
      const c = x.cartoes.find((c) => c.id === tx.cartaoId);
      if (c) c.gasto = Math.max(0, (c.gasto || 0) - tx.valor);
    }
  });
  if (!u) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado' });
  res.json({ sucesso: true, transacoes: u.transacoes, cartoes: u.cartoes, saldo: u.saldo });
});

// ---------- Cartões ----------
app.post('/api/adicionar-cartao', (req, res) => {
  const { email, banco, limite, gastoInicial } = req.body || {};
  if (!banco) return res.status(400).json({ sucesso: false, mensagem: 'Banco obrigatório' });
  const u = updateUser(email, (x) => {
    x.cartoes.push({
      id: Date.now(),
      banco,
      limite: parseFloat(limite) || 0,
      gasto: parseFloat(gastoInicial) || 0,
    });
  });
  if (!u) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado' });
  res.json({ sucesso: true, cartoes: u.cartoes });
});

app.post('/api/remover-cartao', (req, res) => {
  const { email, cartaoId } = req.body || {};
  const u = updateUser(email, (x) => {
    x.cartoes = x.cartoes.filter((c) => c.id !== cartaoId);
  });
  if (!u) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado' });
  res.json({ sucesso: true, cartoes: u.cartoes });
});

// ---------- Frontend estático (build do Lovable) ----------
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
  // SPA fallback — qualquer rota não-API serve index.html
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('▓▓▓ S.O.S-FINANCE — Frontend + Backend unificados ▓▓▓');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`⟡ Servidor:  http://localhost:${PORT}`);
  console.log(`⟡ API:       http://localhost:${PORT}/api`);
  console.log(`⟡ Banco:     ${USERS_FILE}`);
  console.log(`⟡ Estáticos: ${fs.existsSync(PUBLIC_DIR) ? PUBLIC_DIR : '(rode o build do frontend para gerar)'}`);
  console.log('════════════════════════════════════════════════════════════\n');
});
