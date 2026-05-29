// ============================================
// S.O.S-FINANCE - BACKEND
// Sistema profissional de gestão financeira
// ============================================

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, 'usuarios.json');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Inicializar arquivo de usuários
function inicializarArquivo() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
        console.log('[SISTEMA] Banco de dados inicializado');
    }
}

// Ler usuários
function lerUsuarios() {
    try {
        const dados = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(dados);
    } catch (erro) {
        console.error('[ERRO] Falha ao ler dados:', erro);
        return [];
    }
}

// Salvar usuários
function salvarUsuarios(usuarios) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2));
        return true;
    } catch (erro) {
        console.error('[ERRO] Falha ao salvar dados:', erro);
        return false;
    }
}

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend.html'));
});

// ============================================
// MIDDLEWARE DE RATE LIMITING (básico)
// ============================================
const rateLimit = new Map();
function rateLimiter(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const minute = 60 * 1000;
    if (!rateLimit.has(ip)) {
        rateLimit.set(ip, { count: 1, firstRequest: now });
        return next();
    }
    const data = rateLimit.get(ip);
    if (now - data.firstRequest > minute) {
        rateLimit.set(ip, { count: 1, firstRequest: now });
        return next();
    }
    if (data.count >= 100) {
        return res.status(429).json({ sucesso: false, mensagem: 'Muitas requisições. Aguarde um momento.' });
    }
    data.count++;
    rateLimit.set(ip, data);
    next();
}
app.use('/api/', rateLimiter);

// ============================================
// API DE CADASTRO
// ============================================
app.post('/api/cadastrar', (req, res) => {
    const { nome, email, senha } = req.body;
    
    console.log(`[${new Date().toISOString()}] TENTATIVA_CADASTRO: ${email}`);
    
    if (!nome || !email || !senha) {
        return res.status(400).json({ 
            sucesso: false, 
            mensagem: 'Todos os campos são obrigatórios' 
        });
    }
    
    if (senha.length < 6) {
        return res.status(400).json({ 
            sucesso: false, 
            mensagem: 'A senha deve conter no mínimo 6 caracteres' 
        });
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ 
            sucesso: false, 
            mensagem: 'Formato de e-mail inválido' 
        });
    }
    
    const usuarios = lerUsuarios();
    const emailExistente = usuarios.some(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (emailExistente) {
        return res.status(409).json({ 
            sucesso: false, 
            mensagem: 'Este e-mail já está cadastrado' 
        });
    }
    
    const novoUsuario = {
        id: Date.now(),
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        senha: senha,
        dataCadastro: new Date().toISOString(),
        status: 'ativo',
        transacoes: [],
        saldo: 0,
        cartoes: [],
        planejamentoMensal: {
            mes: new Date().getMonth(),
            ano: new Date().getFullYear(),
            metaEconomia: 0,
            previsaoGastos: 0
        },
        despesasFixas: {
            agua: 0, luz: 0, internet: 0, aluguel: 0, condominio: 0, outras: 0
        },
        metaInvestimento: {
            tipo: '', valor: 0, prazo: '', dataCriacao: new Date().toISOString()
        }
    };
    
    usuarios.push(novoUsuario);
    
    if (salvarUsuarios(usuarios)) {
        console.log(`[SUCESSO] Usuário cadastrado: ${email}`);
        const { senha: _, ...usuarioSeguro } = novoUsuario;
        return res.status(201).json({ 
            sucesso: true, 
            mensagem: 'Cadastro realizado com sucesso',
            usuario: usuarioSeguro
        });
    } else {
        return res.status(500).json({ 
            sucesso: false, 
            mensagem: 'Erro interno no servidor' 
        });
    }
});

// ============================================
// API DE LOGIN
// ============================================
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    console.log(`[${new Date().toISOString()}] TENTATIVA_LOGIN: ${email}`);
    if (!email || !senha) {
        return res.status(400).json({ sucesso: false, mensagem: 'Informe e-mail e senha', tipo: 'campos' });
    }
    const usuarios = lerUsuarios();
    const usuario = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!usuario) {
        return res.status(401).json({ sucesso: false, mensagem: 'E-mail não cadastrado', tipo: 'email' });
    }
    if (usuario.senha !== senha) {
        return res.status(401).json({ sucesso: false, mensagem: 'Senha incorreta', tipo: 'senha' });
    }
    console.log(`[SUCESSO] Login realizado: ${usuario.nome} (${email})`);
    const { senha: _, ...usuarioSeguro } = usuario;
    return res.json({ sucesso: true, mensagem: `Bem-vindo, ${usuario.nome}`, usuario: usuarioSeguro });
});

// ============================================
// API PARA RECUPERAR SENHA (código fixo para testes)
// ============================================
app.post('/api/recuperar-senha', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ sucesso: false, mensagem: 'Informe o e-mail' });
    const usuarios = lerUsuarios();
    const usuario = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!usuario) return res.status(404).json({ sucesso: false, mensagem: 'E-mail não encontrado' });
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    usuario.codigoRecuperacao = codigo;
    usuario.codigoExpiracao = Date.now() + 3600000;
    salvarUsuarios(usuarios);
    console.log(`[RECUPERACAO] Código para ${email}: ${codigo}`);
    return res.json({ sucesso: true, mensagem: 'Código enviado', codigo });
});

app.post('/api/redefinir-senha', (req, res) => {
    const { email, codigo, novaSenha } = req.body;
    if (!email || !codigo || !novaSenha) return res.status(400).json({ sucesso: false, mensagem: 'Preencha todos os campos' });
    if (novaSenha.length < 6) return res.status(400).json({ sucesso: false, mensagem: 'Mínimo 6 caracteres' });
    const usuarios = lerUsuarios();
    const usuario = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!usuario) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado' });
    if (usuario.codigoRecuperacao !== codigo) return res.status(400).json({ sucesso: false, mensagem: 'Código inválido' });
    if (Date.now() > usuario.codigoExpiracao) return res.status(400).json({ sucesso: false, mensagem: 'Código expirado' });
    usuario.senha = novaSenha;
    delete usuario.codigoRecuperacao;
    delete usuario.codigoExpiracao;
    salvarUsuarios(usuarios);
    return res.json({ sucesso: true, mensagem: 'Senha redefinida com sucesso' });
});

// ============================================
// TRANSAÇÃO (com validação de limite do cartão)
// ============================================
app.post('/api/transacao', (req, res) => {
    const { email, tipo, descricao, valor, cartaoId } = req.body;
    if (!email || !tipo || !descricao || !valor) {
        return res.status(400).json({ sucesso: false, mensagem: 'Todos os campos obrigatórios' });
    }
    if (valor <= 0) return res.status(400).json({ sucesso: false, mensagem: 'Valor deve ser maior que zero' });
    const usuarios = lerUsuarios();
    const usuarioIndex = usuarios.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (usuarioIndex === -1) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado' });
    const usuario = usuarios[usuarioIndex];
    const valorNumerico = parseFloat(valor);
    
    // Validação de limite do cartão
    if (tipo === 'saida' && cartaoId) {
        const cartao = usuario.cartoes.find(c => c.id === parseInt(cartaoId));
        if (!cartao) return res.status(400).json({ sucesso: false, mensagem: 'Cartão não encontrado' });
        if (cartao.gasto + valorNumerico > cartao.limite) {
            return res.status(400).json({ sucesso: false, mensagem: 'Este gasto excede o limite do cartão!' });
        }
    }
    
    const novaTransacao = {
        id: Date.now(),
        tipo, descricao, valor: valorNumerico,
        cartaoId: cartaoId || null,
        data: new Date().toISOString(),
        mes: new Date().getMonth(),
        ano: new Date().getFullYear()
    };
    usuario.transacoes.push(novaTransacao);
    
    if (tipo === 'entrada') {
        usuario.saldo = (usuario.saldo || 0) + valorNumerico;
    } else {
        usuario.saldo = (usuario.saldo || 0) - valorNumerico;
        if (cartaoId) {
            const cartao = usuario.cartoes.find(c => c.id === parseInt(cartaoId));
            if (cartao) cartao.gasto += valorNumerico;
        }
    }
    
    salvarUsuarios(usuarios);
    return res.json({ sucesso: true, mensagem: 'Transação registrada', saldo: usuario.saldo, transacoes: usuario.transacoes, cartoes: usuario.cartoes });
});

// ============================================
// DELETE de transação (REST)
// ============================================
app.delete('/api/transacao/:id', (req, res) => {
    const { id } = req.params;
    const { email } = req.body;
    if (!email) return res.status(400).json({ sucesso: false, mensagem: 'Email não fornecido' });
    const usuarios = lerUsuarios();
    const usuarioIndex = usuarios.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (usuarioIndex === -1) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado' });
    const usuario = usuarios[usuarioIndex];
    const transacaoIndex = usuario.transacoes.findIndex(t => t.id === parseInt(id));
    if (transacaoIndex === -1) return res.status(404).json({ sucesso: false, mensagem: 'Transação não encontrada' });
    const transacao = usuario.transacoes[transacaoIndex];
    // Reverter efeitos
    if (transacao.tipo === 'entrada') {
        usuario.saldo -= transacao.valor;
    } else {
        usuario.saldo += transacao.valor;
        if (transacao.cartaoId) {
            const cartao = usuario.cartoes.find(c => c.id === transacao.cartaoId);
            if (cartao) cartao.gasto -= transacao.valor;
        }
    }
    usuario.transacoes.splice(transacaoIndex, 1);
    salvarUsuarios(usuarios);
    return res.json({ sucesso: true, mensagem: 'Transação excluída', saldo: usuario.saldo, transacoes: usuario.transacoes, cartoes: usuario.cartoes });
});

// ============================================
// ESTATÍSTICAS (gráfico de pizza)
// ============================================
app.get('/api/stats/:email', (req, res) => {
    const { email } = req.params;
    const usuarios = lerUsuarios();
    const usuario = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!usuario) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado' });
    const transacoes = usuario.transacoes || [];
    let totalEntradas = 0, totalSaidas = 0;
    transacoes.forEach(t => {
        if (t.tipo === 'entrada') totalEntradas += t.valor;
        else totalSaidas += t.valor;
    });
    const total = totalEntradas + totalSaidas;
    const percentEntradas = total === 0 ? 50 : (totalEntradas / total) * 100;
    const percentSaidas = 100 - percentEntradas;
    res.json({
        sucesso: true,
        stats: {
            totalEntradas,
            totalSaidas,
            saldo: totalEntradas - totalSaidas,
            percentualEntradas: percentEntradas.toFixed(1),
            percentualSaidas: percentSaidas.toFixed(1),
            totalTransacoes: transacoes.length
        }
    });
});

// ============================================
// DEMAIS ROTAS (cartões, planejamento, despesas fixas, meta, usuário)
// ============================================
app.post('/api/adicionar-cartao', (req, res) => {
    const { email, banco, limite, gastoInicial } = req.body;
    if (!email || !banco) return res.status(400).json({ sucesso: false, mensagem: 'Banco obrigatório' });
    const usuarios = lerUsuarios();
    const idx = usuarios.findIndex(u => u.email === email);
    if (idx === -1) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado' });
    const novoCartao = { id: Date.now(), banco, limite: parseFloat(limite)||0, gasto: parseFloat(gastoInicial)||0, dataCriacao: new Date().toISOString() };
    usuarios[idx].cartoes.push(novoCartao);
    salvarUsuarios(usuarios);
    res.json({ sucesso: true, mensagem: 'Cartão adicionado', cartao: novoCartao, cartoes: usuarios[idx].cartoes });
});

app.post('/api/atualizar-gasto-cartao', (req, res) => {
    const { email, cartaoId, novoGasto } = req.body;
    const usuarios = lerUsuarios();
    const idx = usuarios.findIndex(u => u.email === email);
    if (idx === -1) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado' });
    const cartao = usuarios[idx].cartoes.find(c => c.id === parseInt(cartaoId));
    if (!cartao) return res.status(404).json({ sucesso: false, mensagem: 'Cartão não encontrado' });
    cartao.gasto = parseFloat(novoGasto);
    salvarUsuarios(usuarios);
    res.json({ sucesso: true, mensagem: 'Gasto atualizado', cartao, cartoes: usuarios[idx].cartoes });
});

app.post('/api/remover-cartao', (req, res) => {
    const { email, cartaoId } = req.body;
    const usuarios = lerUsuarios();
    const idx = usuarios.findIndex(u => u.email === email);
    if (idx === -1) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado' });
    usuarios[idx].cartoes = usuarios[idx].cartoes.filter(c => c.id !== parseInt(cartaoId));
    salvarUsuarios(usuarios);
    res.json({ sucesso: true, mensagem: 'Cartão removido', cartoes: usuarios[idx].cartoes });
});

app.post('/api/planejamento', (req, res) => {
    const { email, metaEconomia, previsaoGastos } = req.body;
    const usuarios = lerUsuarios();
    const idx = usuarios.findIndex(u => u.email === email);
    if (idx === -1) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado' });
    usuarios[idx].planejamentoMensal = { mes: new Date().getMonth(), ano: new Date().getFullYear(), metaEconomia: parseFloat(metaEconomia)||0, previsaoGastos: parseFloat(previsaoGastos)||0 };
    salvarUsuarios(usuarios);
    res.json({ sucesso: true, mensagem: 'Planejamento salvo', planejamento: usuarios[idx].planejamentoMensal });
});

app.post('/api/despesas-fixas', (req, res) => {
    const { email, agua, luz, internet, aluguel, condominio, outras } = req.body;
    const usuarios = lerUsuarios();
    const idx = usuarios.findIndex(u => u.email === email);
    if (idx === -1) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado' });
    usuarios[idx].despesasFixas = { agua: parseFloat(agua)||0, luz: parseFloat(luz)||0, internet: parseFloat(internet)||0, aluguel: parseFloat(aluguel)||0, condominio: parseFloat(condominio)||0, outras: parseFloat(outras)||0 };
    salvarUsuarios(usuarios);
    res.json({ sucesso: true, mensagem: 'Despesas fixas salvas', despesasFixas: usuarios[idx].despesasFixas });
});

app.post('/api/meta-investimento', (req, res) => {
    const { email, tipo, valor } = req.body;
    const usuarios = lerUsuarios();
    const idx = usuarios.findIndex(u => u.email === email);
    if (idx === -1) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado' });
    usuarios[idx].metaInvestimento = { tipo, valor: parseFloat(valor)||0, prazo: tipo, dataCriacao: new Date().toISOString() };
    salvarUsuarios(usuarios);
    res.json({ sucesso: true, mensagem: 'Meta salva', metaInvestimento: usuarios[idx].metaInvestimento });
});

app.get('/api/usuario/:email', (req, res) => {
    const { email } = req.params;
    const usuarios = lerUsuarios();
    const usuario = usuarios.find(u => u.email === email);
    if (!usuario) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado' });
    const transacoes = usuario.transacoes || [];
    const resumoMensal = {};
    transacoes.forEach(t => {
        const key = `${t.mes+1}/${t.ano}`;
        if (!resumoMensal[key]) resumoMensal[key] = { entradas: 0, saidas: 0 };
        if (t.tipo === 'entrada') resumoMensal[key].entradas += t.valor;
        else resumoMensal[key].saidas += t.valor;
    });
    const evolucao = Object.entries(resumoMensal).map(([periodo, dados]) => ({ periodo, entradas: dados.entradas, saidas: dados.saidas, saldo: dados.entradas - dados.saidas })).sort((a,b)=>a.periodo.localeCompare(b.periodo));
    const { senha: _, ...usuarioSeguro } = usuario;
    res.json({ sucesso: true, usuario: { ...usuarioSeguro, resumoMensal: Object.entries(resumoMensal).map(([p,d])=>({periodo:p,...d})), evolucaoMensal: evolucao } });
});

app.get('/api/usuarios', (req, res) => {
    const usuarios = lerUsuarios();
    res.json(usuarios.map(({ senha, ...resto }) => resto));
});

// Inicializar servidor
inicializarArquivo();
app.listen(PORT, () => {
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('▓▓▓ S.O.S-FINANCE - SISTEMA FINANCEIRO ▓▓▓');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`⟡ SERVIDOR ATIVO: http://localhost:${PORT}`);
    console.log(`⟡ BANCO DE DADOS: ${USERS_FILE}`);
    console.log('════════════════════════════════════════════════════════════\n');
});