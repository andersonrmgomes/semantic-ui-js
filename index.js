const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require("path");
const bcrypt = require('bcrypt');
const session = require('express-session');

const App = express();
App.set("view engine", "ejs");
App.set("views", path.join(__dirname, "mvc/views"));
App.use(express.static(path.join(__dirname, "public")));
App.use(cors('*'));
App.use(express.urlencoded({ extended: true }));

// Configuração da sessão
App.use(session({
    secret: 'segredo123', 
    resave: false,
    saveUninitialized: true
}));

const connection = mysql.createPool({
    host: 'localhost',
    user: 'root',
    database: 'dengue'
});

// Middleware para verificar login
function verificarLogin(req, res, next) {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    next();
}

// Rota para exibir a página de cadastro
App.get('/cadastro', (req, res) => {
    res.render('cadastro', { mensagem: null });
});

// Rota para processar o cadastro
App.post('/cadastro', async (req, res) => {
    const { nome, email, senha } = req.body;

    try {
        // Verificar se o e-mail já existe
        const [existe] = await connection.execute('SELECT * FROM usuario WHERE email = ?', [email]);
        if (existe.length > 0) {
            return res.render('cadastro', { mensagem: 'E-mail já cadastrado!' });
        }

        // Criptografar a senha antes de salvar
        const senhaCriptografada = await bcrypt.hash(senha, 10);

        // Inserir usuário com id_grupo = 2 (Usuário Comum)
        await connection.execute(
            'INSERT INTO usuario (nome, email, senha, id_grupo) VALUES (?, ?, ?, 2)',
            [nome, email, senhaCriptografada]
        );

        res.render('cadastro', { mensagem: 'Cadastro realizado com sucesso! Faça login.' });

    } catch (error) {
        console.error("Erro no cadastro:", error);
        res.render('cadastro', { mensagem: 'Erro ao realizar cadastro.' });
    }
});

// Rota para login (já existente)
App.get('/login', (req, res) => {
    res.render('login', { mensagem: null });
});

// Rota para processar o login (já existente)
App.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        const [rows] = await connection.execute('SELECT * FROM usuario WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.render('login', { mensagem: 'Usuário não encontrado!' });
        }

        const usuario = rows[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            return res.render('login', { mensagem: 'Senha incorreta!' });
        }

        // Salvar sessão do usuário
        req.session.usuario = { id: usuario.id, nome: usuario.nome };

        return res.redirect('/home');

    } catch (error) {
        console.error("Erro no login:", error);
        res.render('login', { mensagem: 'Erro ao processar login.' });
    }
});



// Rota para home (já existente)
App.get('/home', verificarLogin, (req, res) => {
    res.render('home', { usuario: req.session.usuario });
});

// Rota de logout (já existente)
App.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Rota para exibir a lista de estados
App.get('/estados', async (req, res) => {
    const [estados] = await connection.execute('SELECT * FROM estado ORDER BY nome LIMIT 10');
    res.render('estados', { estados });
});

App.post('/cadastrarEstado', async (req, res) => {
    const { uf, nome } = req.body;

    try {
        await connection.execute('INSERT INTO estado (uf, nome) VALUES (?, ?)', [uf, nome]);
        res.redirect('/estados'); // Redireciona para a lista de estados
    } catch (error) {
        console.error('Erro ao cadastrar estado:', error);
        res.status(500).send('Erro no servidor');
    }
});

// Rota para excluir um estado
App.post('/estados/delete/:id', async (req, res) => {
    const { id } = req.params;
    await connection.execute('DELETE FROM estado WHERE id = ?', [id]);
    res.redirect('/estados');
});

// Rota para editar um estado
App.get('/editarEstado/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [estado] = await connection.execute('SELECT * FROM estado WHERE id = ?', [id]);

        if (estado.length > 0) {
            res.render('editarEstado', { estado: estado[0] });
        } else {
            res.status(404).send('Estado não encontrado');
        }
    } catch (error) {
        console.error('Erro ao buscar estado:', error);
        res.status(500).send('Erro no servidor');
    }
});

App.use(express.json()); // Para interpretar JSON no corpo da requisição

App.post('/atualizarEstado/:id', async (req, res) => {
    const { id } = req.params;
    const { uf, nome } = req.body;

    try {
        await connection.execute('UPDATE estado SET uf = ?, nome = ? WHERE id = ?', [uf, nome, id]);
        res.status(200).send({ message: "Estado atualizado com sucesso!" });
    } catch (error) {
        console.error('Erro ao atualizar estado:', error);
        res.status(500).send({ error: "Erro no servidor" });
    }
});



App.get('/estados', async (req, res) => {
    try {
        const [estados] = await connection.execute('SELECT * FROM estado ORDER BY nome LIMIT 10');
        res.render('estados', { estados , usuario: req.session.usuario}); //{ usuario: req.session.usuario }
    } catch (error) {
        console.error("Erro ao buscar estados:", error);
        res.status(500).send("Erro ao carregar estados.");
    }
});


// Inicia o servidor
App.listen(8443, () => console.log('Servidor Online'));
