const bcrypt = require('bcrypt');

async function gerarSenha() {
    const senhaCriptografada = await bcrypt.hash("123456", 10);
    console.log(senhaCriptografada);
}

gerarSenha();
