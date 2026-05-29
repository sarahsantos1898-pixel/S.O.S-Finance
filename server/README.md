# S.O.S-FINANCE — Frontend + Backend numa pasta só

Esta pasta `server/` contém o **backend Express** e também serve o **build do frontend** (gerado pelo Lovable / TanStack Start) na mesma porta. Como tudo roda na mesma origem, **não existe CORS**.

```
sua-pasta/
├── frontend/          ← código do Lovable (este projeto)
└── server/            ← esta pasta
    ├── server.js      ← Express + API + estáticos
    ├── package.json
    ├── users.json     ← criado em runtime (banco)
    └── public/        ← build do frontend (você gera)
```

## Como rodar tudo junto

### 1. Build do frontend
Na pasta do projeto Lovable (frontend):
```bash
npm install
npm run build
```
Isso gera a pasta `dist/` (ou similar). Copie o conteúdo para `server/public/`:
```bash
cp -r dist/* ../server/public/
```

### 2. Instale e suba o backend
```bash
cd server
npm install
npm start
```

Pronto:
- Frontend: http://localhost:3000
- API:       http://localhost:3000/api

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/cadastrar` | Cria usuário (senha com bcrypt) |
| POST | `/api/login` | Autentica |
| POST | `/api/recuperar-senha` | Gera código de recuperação |
| POST | `/api/redefinir-senha` | Redefine senha com código |
| GET  | `/api/usuario/:email` | Retorna dados do usuário |
| POST | `/api/transacao` | Cria transação |
| DELETE | `/api/transacao/:id` | Remove transação |
| POST | `/api/adicionar-cartao` | Cria cartão |
| POST | `/api/remover-cartao` | Remove cartão |

## Desenvolvimento separado (hot-reload do front)

Se quiser rodar o front em dev (Vite/HMR) e o back em paralelo:

1. Suba só o backend: `cd server && npm start` (porta 3000)
2. No front, crie `.env`:
   ```
   VITE_API_URL=http://localhost:3000/api
   ```
3. Rode `npm run dev` no front (porta 5173). Nesse caso você verá CORS — adicione o middleware abaixo em `server.js`:
   ```js
   app.use((req, res, next) => {
     res.header('Access-Control-Allow-Origin', '*');
     res.header('Access-Control-Allow-Headers', 'Content-Type');
     res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
     if (req.method === 'OPTIONS') return res.sendStatus(204);
     next();
   });
   ```

## Melhorias aplicadas vs versão original
- Senhas agora com **bcrypt** (não mais texto puro)
- Frontend e backend na **mesma origem** → sem CORS
- API client do front usa `/api` relativo por padrão
- SPA fallback para que rotas como `/dashboard` funcionem após F5
