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
            agua: 0,
            luz: 0,
            internet: 0,
            aluguel: 0,
            condominio: 0,
            outras: 0
        },
        metaInvestimento: {
            tipo: '',
            valor: 0,
            prazo: '',
            dataCriacao: new Date().toISOString()
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
        return res.status(400).json({ 
            sucesso: false, 
            mensagem: 'Informe e-mail e senha',
            tipo: 'campos'
        });
    }
    
    const usuarios = lerUsuarios();
    const usuario = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!usuario) {
        console.log(`[FALHA] Usuário não encontrado: ${email}`);
        return res.status(401).json({ 
            sucesso: false, 
            mensagem: 'E-mail não cadastrado',
            tipo: 'email'
        });
    }
    
    if (usuario.senha !== senha) {
        console.log(`[FALHA] Senha incorreta: ${email}`);
        return res.status(401).json({ 
            sucesso: false, 
            mensagem: 'Senha incorreta',
            tipo: 'senha'
        });
    }
    
    console.log(`[SUCESSO] Login realizado: ${usuario.nome} (${email})`);
    
    const { senha: _, ...usuarioSeguro } = usuario;
    
    return res.json({ 
        sucesso: true, 
        mensagem: `Bem-vindo, ${usuario.nome}`,
        usuario: usuarioSeguro
    });
});

// ============================================
// API PARA RECUPERAR SENHA
// ============================================
app.post('/api/recuperar-senha', (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ 
            sucesso: false, 
            mensagem: 'Informe o e-mail para recuperação' 
        });
    }
    
    const usuarios = lerUsuarios();
    const usuario = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!usuario) {
        return res.status(404).json({ 
            sucesso: false, 
            mensagem: 'E-mail não encontrado no sistema' 
        });
    }
    
    const codigoRecuperacao = Math.floor(100000 + Math.random() * 900000).toString();
    
    usuario.codigoRecuperacao = codigoRecuperacao;
    usuario.codigoExpiracao = Date.now() + 3600000;
    salvarUsuarios(usuarios);
    
    console.log(`[RECUPERACAO] Código para ${email}: ${codigoRecuperacao}`);
    
    return res.json({ 
        sucesso: true, 
        mensagem: 'Código de recuperação enviado',
        codigo: codigoRecuperacao
    });
});

// ============================================
// API PARA REDEFINIR SENHA
// ============================================
app.post('/api/redefinir-senha', (req, res) => {
    const { email, codigo, novaSenha } = req.body;
    
    if (!email || !codigo || !novaSenha) {
        return res.status(400).json({ 
            sucesso: false, 
            mensagem: 'Preencha todos os campos' 
        });
    }
    
    if (novaSenha.length < 6) {
        return res.status(400).json({ 
            sucesso: false, 
            mensagem: 'A nova senha deve ter no mínimo 6 caracteres' 
        });
    }
    
    const usuarios = lerUsuarios();
    const usuario = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!usuario) {
        return res.status(404).json({ 
            sucesso: false, 
            mensagem: 'Usuário não encontrado' 
        });
    }
    
    if (usuario.codigoRecuperacao !== codigo) {
        return res.status(400).json({ 
            sucesso: false, 
            mensagem: 'Código de recuperação inválido' 
        });
    }
    
    if (Date.now() > usuario.codigoExpiracao) {
        return res.status(400).json({ 
            sucesso: false, 
            mensagem: 'Código expirado. Solicite um novo' 
        });
    }
    
    usuario.senha = novaSenha;
    delete usuario.codigoRecuperacao;
    delete usuario.codigoExpiracao;
    salvarUsuarios(usuarios);
    
    return res.json({ 
        sucesso: true, 
        mensagem: 'Senha redefinida com sucesso' 
    });
});

// ============================================
// API PARA TRANSAÇÕES FINANCEIRAS
// ============================================
app.post('/api/transacao', (req, res) => {
    const { email, tipo, descricao, valor, cartaoId } = req.body;
    
    if (!email || !tipo || !descricao || !valor) {
        return res.status(400).json({ 
            sucesso: false, 
            mensagem: 'Todos os campos são obrigatórios' 
        });
    }
    
    if (valor <= 0) {
        return res.status(400).json({ 
            sucesso: false, 
            mensagem: 'O valor deve ser maior que zero' 
        });
    }
    
    const usuarios = lerUsuarios();
    const usuarioIndex = usuarios.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (usuarioIndex === -1) {
        return res.status(404).json({ 
            sucesso: false, 
            mensagem: 'Usuário não encontrado' 
        });
    }
    
    const usuario = usuarios[usuarioIndex];
    const valorNumerico = parseFloat(valor);
    
    const novaTransacao = {
        id: Date.now(),
        tipo: tipo,
        descricao: descricao,
        valor: valorNumerico,
        cartaoId: cartaoId || null,
        data: new Date().toISOString(),
        mes: new Date().getMonth(),
        ano: new Date().getFullYear()
    };
    
    if (!usuario.transacoes) {
        usuario.transacoes = [];
    }
    
    usuario.transacoes.push(novaTransacao);
    
    if (tipo === 'entrada') {
        usuario.saldo = (usuario.saldo || 0) + valorNumerico;
    } else if (tipo === 'saida') {
        usuario.saldo = (usuario.saldo || 0) - valorNumerico;
        
        if (cartaoId && usuario.cartoes) {
            const cartaoIndex = usuario.cartoes.findIndex(c => c.id === parseInt(cartaoId));
            if (cartaoIndex !== -1) {
                usuario.cartoes[cartaoIndex].gasto = (usuario.cartoes[cartaoIndex].gasto || 0) + valorNumerico;
            }
        }
    }
    
    salvarUsuarios(usuarios);
    
    return res.json({ 
        sucesso: true, 
        mensagem: 'Transação registrada com sucesso',
        saldo: usuario.saldo,
        transacoes: usuario.transacoes,
        cartoes: usuario.cartoes
    });
});

// ============================================
// API PARA EDITAR TRANSAÇÃO
// ============================================
app.post('/api/editar-transacao', (req, res) => {
    const { email, transacaoId, descricao, valor, tipo, cartaoId } = req.body;
    
    if (!email || !transacaoId) {
        return res.status(400).json({ 
            sucesso: false, 
            mensagem: 'Dados incompletos' 
        });
    }
    
    const usuarios = lerUsuarios();
    const usuarioIndex = usuarios.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (usuarioIndex === -1) {
        return res.status(404).json({ 
            sucesso: false, 
            mensagem: 'Usuário não encontrado' 
        });
    }
    
    const usuario = usuarios[usuarioIndex];
    const transacaoIndex = usuario.transacoes.findIndex(t => t.id === parseInt(transacaoId));
    
    if (transacaoIndex === -1) {
        return res.status(404).json({ 
            sucesso: false, 
            mensagem: 'Transação não encontrada' 
        });
    }
    
    const transacaoOriginal = usuario.transacoes[transacaoIndex];
    const valorOriginal = transacaoOriginal.valor;
    const tipoOriginal = transacaoOriginal.tipo;
    const cartaoIdOriginal = transacaoOriginal.cartaoId;
    
    if (tipoOriginal === 'entrada') {
        usuario.saldo -= valorOriginal;
    } else if (tipoOriginal === 'saida') {
        usuario.saldo += valorOriginal;
        
        if (cartaoIdOriginal && usuario.cartoes) {
            const cartaoOriginal = usuario.cartoes.find(c => c.id === cartaoIdOriginal);
            if (cartaoOriginal) {
                cartaoOriginal.gasto -= valorOriginal;
            }
        }
    }
    
    const novoValor = parseFloat(valor);
    usuario.transacoes[transacaoIndex] = {
        ...transacaoOriginal,
        descricao: descricao || transacaoOriginal.descricao,
        valor: novoValor,
        tipo: tipo || transacaoOriginal.tipo,
        cartaoId: cartaoId || null,
        dataAtualizacao: new Date().toISOString()
    };
    
    const novoTipo = tipo || transacaoOriginal.tipo;
    if (novoTipo === 'entrada') {
        usuario.saldo += novoValor;
    } else if (novoTipo === 'saida') {
        usuario.saldo -= novoValor;
        
        if (cartaoId && usuario.cartoes) {
            const cartao = usuario.cartoes.find(c => c.id === parseInt(cartaoId));
            if (cartao) {
                cartao.gasto = (cartao.gasto || 0) + novoValor;
            }
        }
    }
    
    salvarUsuarios(usuarios);
    
    return res.json({ 
        sucesso: true, 
        mensagem: 'Transação editada com sucesso',
        saldo: usuario.saldo,
        transacoes: usuario.transacoes,
        cartoes: usuario.cartoes
    });
});

// ============================================
// API PARA EXCLUIR TRANSAÇÃO
// ============================================
app.post('/api/excluir-transacao', (req, res) => {
    const { email, transacaoId } = req.body;
    
    if (!email || !transacaoId) {
        return res.status(400).json({ 
            sucesso: false, 
            mensagem: 'Dados incompletos' 
        });
    }
    
    const usuarios = lerUsuarios();
    const usuarioIndex = usuarios.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (usuarioIndex === -1) {
        return res.status(404).json({ 
            sucesso: false, 
            mensagem: 'Usuário não encontrado' 
        });
    }
    
    const usuario = usuarios[usuarioIndex];
    const transacaoIndex = usuario.transacoes.findIndex(t => t.id === parseInt(transacaoId));
    
    if (transacaoIndex === -1) {
        return res.status(404).json({ 
            sucesso: false, 
            mensagem: 'Transação não encontrada' 
        });
    }
    
    const transacao = usuario.transacoes[transacaoIndex];
    
    if (transacao.tipo === 'entrada') {
        usuario.saldo -= transacao.valor;
    } else if (transacao.tipo === 'saida') {
        usuario.saldo += transacao.valor;
        
        if (transacao.cartaoId && usuario.cartoes) {
            const cartao = usuario.cartoes.find(c => c.id === transacao.cartaoId);
            if (cartao) {
                cartao.gasto -= transacao.valor;
            }
        }
    }
    
    usuario.transacoes.splice(transacaoIndex, 1);
    
    salvarUsuarios(usuarios);
    
    return res.json({ 
        sucesso: true, 
        mensagem: 'Transação excluída com sucesso',
        saldo: usuario.saldo,
        transacoes: usuario.transacoes,
        cartoes: usuario.cartoes
    });
});

// ============================================
// API PARA ADICIONAR CARTÃO DE CRÉDITO
// ============================================
app.post('/api/adicionar-cartao', (req, res) => {
    const { email, banco, limite, gastoInicial } = req.body;
    
    if (!email || !banco) {
        return res.status(400).json({ 
            sucesso: false, 
            mensagem: 'Banco é obrigatório' 
        });
    }
    
    const usuarios = lerUsuarios();
    const usuarioIndex = usuarios.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (usuarioIndex === -1) {
        return res.status(404).json({ 
            sucesso: false, 
            mensagem: 'Usuário não encontrado' 
        });
    }
    
    if (!usuarios[usuarioIndex].cartoes) {
        usuarios[usuarioIndex].cartoes = [];
    }
    
    const novoCartao = {
        id: Date.now(),
        banco: banco,
        limite: parseFloat(limite) || 0,
        gasto: parseFloat(gastoInicial) || 0,
        dataCriacao: new Date().toISOString()
    };
    
    usuarios[usuarioIndex].cartoes.push(novoCartao);
    salvarUsuarios(usuarios);
    
    return res.json({ 
        sucesso: true, 
        mensagem: 'Cartão adicionado com sucesso',
        cartao: novoCartao,
        cartoes: usuarios[usuarioIndex].cartoes
    });
});

// ============================================
// API PARA ATUALIZAR GASTO DO CARTÃO
// ============================================
app.post('/api/atualizar-gasto-cartao', (req, res) => {
    const { email, cartaoId, novoGasto } = req.body;
    
    if (!email || !cartaoId || novoGasto === undefined) {
        return res.status(400).json({ 
            sucesso: false, 
            mensagem: 'Dados incompletos' 
        });
    }
    
    const usuarios = lerUsuarios();
    const usuarioIndex = usuarios.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (usuarioIndex === -1) {
        return res.status(404).json({ 
            sucesso: false, 
            mensagem: 'Usuário não encontrado' 
        });
    }
    
    const cartao = usuarios[usuarioIndex].cartoes?.find(c => c.id === parseInt(cartaoId));
    
    if (!cartao) {
        return res.status(404).json({ 
            sucesso: false, 
            mensagem: 'Cartão não encontrado' 
        });
    }
    
    cartao.gasto = parseFloat(novoGasto);
    salvarUsuarios(usuarios);
    
    return res.json({ 
        sucesso: true, 
        mensagem: 'Gasto atualizado com sucesso',
        cartao: cartao,
        cartoes: usuarios[usuarioIndex].cartoes
    });
});

// ============================================
// API PARA REMOVER CARTÃO
// ============================================
app.post('/api/remover-cartao', (req, res) => {
    const { email, cartaoId } = req.body;
    
    if (!email || !cartaoId) {
        return res.status(400).json({ 
            sucesso: false, 
            mensagem: 'Dados incompletos' 
        });
    }
    
    const usuarios = lerUsuarios();
    const usuarioIndex = usuarios.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (usuarioIndex === -1) {
        return res.status(404).json({ 
            sucesso: false, 
            mensagem: 'Usuário não encontrado' 
        });
    }
    
    usuarios[usuarioIndex].cartoes = usuarios[usuarioIndex].cartoes?.filter(c => c.id !== parseInt(cartaoId)) || [];
    salvarUsuarios(usuarios);
    
    return res.json({ 
        sucesso: true, 
        mensagem: 'Cartão removido com sucesso',
        cartoes: usuarios[usuarioIndex].cartoes
    });
});

// ============================================
// API PARA CONFIGURAR PLANEJAMENTO MENSAL
// ============================================
app.post('/api/planejamento', (req, res) => {
    const { email, metaEconomia, previsaoGastos } = req.body;
    
    const usuarios = lerUsuarios();
    const usuarioIndex = usuarios.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (usuarioIndex === -1) {
        return res.status(404).json({ 
            sucesso: false, 
            mensagem: 'Usuário não encontrado' 
        });
    }
    
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    
    usuarios[usuarioIndex].planejamentoMensal = {
        mes: mesAtual,
        ano: anoAtual,
        metaEconomia: parseFloat(metaEconomia) || 0,
        previsaoGastos: parseFloat(previsaoGastos) || 0
    };
    
    salvarUsuarios(usuarios);
    
    return res.json({ 
        sucesso: true, 
        mensagem: 'Planejamento mensal salvo',
        planejamento: usuarios[usuarioIndex].planejamentoMensal
    });
});

// ============================================
// API PARA CONFIGURAR DESPESAS FIXAS
// ============================================
app.post('/api/despesas-fixas', (req, res) => {
    const { email, agua, luz, internet, aluguel, condominio, outras } = req.body;
    
    const usuarios = lerUsuarios();
    const usuarioIndex = usuarios.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (usuarioIndex === -1) {
        return res.status(404).json({ 
            sucesso: false, 
            mensagem: 'Usuário não encontrado' 
        });
    }
    
    usuarios[usuarioIndex].despesasFixas = {
        agua: parseFloat(agua) || 0,
        luz: parseFloat(luz) || 0,
        internet: parseFloat(internet) || 0,
        aluguel: parseFloat(aluguel) || 0,
        condominio: parseFloat(condominio) || 0,
        outras: parseFloat(outras) || 0
    };
    
    salvarUsuarios(usuarios);
    
    return res.json({ 
        sucesso: true, 
        mensagem: 'Despesas fixas salvas com sucesso',
        despesasFixas: usuarios[usuarioIndex].despesasFixas
    });
});

// ============================================
// API PARA CONFIGURAR META DE INVESTIMENTO
// ============================================
app.post('/api/meta-investimento', (req, res) => {
    const { email, tipo, valor, prazo } = req.body;
    
    const usuarios = lerUsuarios();
    const usuarioIndex = usuarios.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (usuarioIndex === -1) {
        return res.status(404).json({ 
            sucesso: false, 
            mensagem: 'Usuário não encontrado' 
        });
    }
    
    usuarios[usuarioIndex].metaInvestimento = {
        tipo: tipo,
        valor: parseFloat(valor) || 0,
        prazo: prazo,
        dataCriacao: new Date().toISOString()
    };
    
    salvarUsuarios(usuarios);
    
    return res.json({ 
        sucesso: true, 
        mensagem: 'Meta de investimento salva com sucesso',
        metaInvestimento: usuarios[usuarioIndex].metaInvestimento
    });
});

// ============================================
// API PARA BUSCAR DADOS DO USUÁRIO
// ============================================
app.get('/api/usuario/:email', (req, res) => {
    const { email } = req.params;
    
    const usuarios = lerUsuarios();
    const usuario = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!usuario) {
        return res.status(404).json({ 
            sucesso: false, 
            mensagem: 'Usuário não encontrado' 
        });
    }
    
    const transacoes = usuario.transacoes || [];
    const resumoMensal = {};
    const evolucaoMensal = [];
    
    transacoes.forEach(t => {
        const chave = `${t.mes + 1}/${t.ano}`;
        if (!resumoMensal[chave]) {
            resumoMensal[chave] = { entradas: 0, saidas: 0, saldo: 0 };
        }
        if (t.tipo === 'entrada') {
            resumoMensal[chave].entradas += t.valor;
        } else {
            resumoMensal[chave].saidas += t.valor;
        }
        resumoMensal[chave].saldo = resumoMensal[chave].entradas - resumoMensal[chave].saidas;
    });
    
    for (const [periodo, dados] of Object.entries(resumoMensal)) {
        evolucaoMensal.push({
            periodo,
            entradas: dados.entradas,
            saidas: dados.saidas,
            saldo: dados.saldo
        });
    }
    evolucaoMensal.sort((a, b) => {
        const [mesA, anoA] = a.periodo.split('/');
        const [mesB, anoB] = b.periodo.split('/');
        if (anoA !== anoB) return parseInt(anoA) - parseInt(anoB);
        return parseInt(mesA) - parseInt(mesB);
    });
    
    const { senha: _, ...usuarioSeguro } = usuario;
    
    return res.json({ 
        sucesso: true, 
        usuario: {
            ...usuarioSeguro,
            resumoMensal: Object.entries(resumoMensal).map(([periodo, dados]) => ({
                periodo,
                ...dados
            })).sort((a, b) => b.periodo.localeCompare(a.periodo)),
            evolucaoMensal: evolucaoMensal
        }
    });
});

// ============================================
// API PARA LISTAR USUÁRIOS
// ============================================
app.get('/api/usuarios', (req, res) => {
    const usuarios = lerUsuarios();
    const usuariosPublicos = usuarios.map(({ senha, ...resto }) => resto);
    res.json(usuariosPublicos);
});

// Inicializar servidor
inicializarArquivo();

app.listen(PORT, () => {
    console.log('\n' + '═'.repeat(60));
    console.log('▓▓▓ S.O.S-FINANCE - SISTEMA FINANCEIRO ▓▓▓');
    console.log('═'.repeat(60));
    console.log(`⟡ SERVIDOR ATIVO: http://localhost:${PORT}`);
    console.log(`⟡ BANCO DE DADOS: ${USERS_FILE}`);
    console.log('═'.repeat(60) + '\n');
});