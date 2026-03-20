// ============================================
// S.O.S-FINANCE - Backend
// Arquivo: backend.js
// ============================================

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const ARQUIVO_USUARIOS = 'usuarios.json';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Função para ler usuários
function lerUsuarios() {
    try {
        if (!fs.existsSync(ARQUIVO_USUARIOS)) {
            // Criar arquivo se não existir
            fs.writeFileSync(ARQUIVO_USUARIOS, '[]');
            return [];
        }
        const dados = fs.readFileSync(ARQUIVO_USUARIOS, 'utf8');
        return JSON.parse(dados);
    } catch (erro) {
        console.log('Erro ao ler usuários:', erro);
        return [];
    }
}

// Função para salvar usuários
function salvarUsuarios(usuarios) {
    fs.writeFileSync(ARQUIVO_USUARIOS, JSON.stringify(usuarios, null, 2));
}

// Rota principal - Frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend.html'));
});

// ROTA DE CADASTRO
app.post('/api/cadastrar', (req, res) => {
    const { nome, email, senha } = req.body;
    
    console.log('Recebido cadastro:', { nome, email, senha: '***' });
    
    // Validações
    if (!nome || !email || !senha) {
        return res.json({ 
            sucesso: false, 
            mensagem: 'Todos os campos são obrigatórios' 
        });
    }
    
    if (senha.length < 6) {
        return res.json({ 
            sucesso: false, 
            mensagem: 'A senha deve ter no mínimo 6 caracteres' 
        });
    }
    
    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.json({ 
            sucesso: false, 
            mensagem: 'Formato de e-mail inválido' 
        });
    }
    
    // Verificar se email já existe
    const usuarios = lerUsuarios();
    const emailExiste = usuarios.some(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (emailExiste) {
        return res.json({ 
            sucesso: false, 
            mensagem: 'Este e-mail já está cadastrado' 
        });
    }
    
    // Criar novo usuário
    const novoUsuario = {
        id: Date.now(),
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        senha: senha,
        dataCadastro: new Date().toLocaleString('pt-BR')
    };
    
    usuarios.push(novoUsuario);
    salvarUsuarios(usuarios);
    
    console.log('Usuário cadastrado com sucesso:', novoUsuario.email);
    
    res.json({ 
        sucesso: true, 
        mensagem: 'Cadastro realizado com sucesso!' 
    });
});

// ROTA DE LOGIN (para redirecionamento)
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    
    const usuarios = lerUsuarios();
    const usuario = usuarios.find(u => 
        u.email.toLowerCase() === email.toLowerCase() && 
        u.senha === senha
    );
    
    if (usuario) {
        res.json({ 
            sucesso: true, 
            mensagem: `Bem-vindo, ${usuario.nome}!` 
        });
    } else {
        res.json({ 
            sucesso: false, 
            mensagem: 'E-mail ou senha incorretos' 
        });
    }
});

// Rota para listar usuários (apenas para debug)
app.get('/api/usuarios', (req, res) => {
    const usuarios = lerUsuarios();
    const usuariosSemSenha = usuarios.map(({ senha, ...resto }) => resto);
    res.json(usuariosSemSenha);
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 S.O.S-FINANCE - Sistema Rodando!');
    console.log('='.repeat(50));
    console.log(`📌 Acesse: http://localhost:${PORT}`);
    console.log('='.repeat(50) + '\n');
});