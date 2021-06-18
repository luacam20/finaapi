const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();

//midware para receber um json
app.use(express.json());

//Banco de dados falso para armazenar nossos usuarios falsos 
const customers = [];

//Middleware de verificação de conta depois vamos usar dentro da requisição
function verifyExistsAccountCPF(request, response, next) {
    const { cpf } = request.headers;

    const customer = customers.find((customer) => customer.cpf === cpf);

    if(!customer) {
        return response.status(400).json({ error: "Customer not found" });    
    }

    //Repassando custumer para usar em outras rotas
    //o custumer depois de request, é nomeado, ele recebe o custumer verdadeiro  
    request.customer = customer;

    return next();
}

function getBalance(statement) {
    //reduce = função que pega inf de determinado valor que vamos passar e transformar todos valores em um
    const balance = statement.reduce((acc, operation) => {
       if(operation.type === 'credit') {
            return acc + operation.amount;
       } else {
            return acc - operation.amount;     
       }
    }, 0);

    return balance;
}

app.post("/account", (request, response) => {
    const { cpf, name } = request.body; 

    //Verificar se o cfp realmente 
    //custumers.some = busca no Banco de dados se o cpf existe 
    const customerAlredyExists = customers.some(
        //Compara se o tipo e o valor da variavel é igual 
        (customer) => customer.cpf === cpf
    );

    //Se existir um cpf igual no Banco de dados 
    if(customerAlredyExists){
        //Vou retornar um status de erro e uma mensagem 
        return response.status(400).json({error: "Custumer alredy exists!"});
    }
    //Se não encontrar um cpf igual no banco, ele vai permitir o cadastro

    //inserir dados dentro do Banco de dados fake
    customers.push({
        cpf,
        name,
        id: uuidv4(), //O id recebe a função de criação do uuid
        statement: []
    });

    //Se der tudo certo, vamos retornar uma resposta
    return response.status(201).send();

    
}); 

//Para passar o midware ele tem que estar entre a rota e a requisição e para colocar outros midwares 
//è so ir adicionando uma virgula
app.get("/statement", verifyExistsAccountCPF, (request, response) => {
    //Recuperando custumer, fazendo desestruturação 
    const { customer } = request;

    return response.json(customer.statement);
}) 

app.post("/deposit", verifyExistsAccountCPF, (request, response) => {
    //vamos receber no deposito e receber essas informações dentro do nosso custumer 
    const { description, amount } = request.body;

    const { customer } = request;
    
    //Oque a operação esta recebendo 
    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit",
    }

    //Inserindo a operação dentro do custumer
    customer.statement.push(statementOperation);

    return response.status(201).send();
});

app.post("/withdraw", verifyExistsAccountCPF,(request, response) => {
    //Valor que eu to querendo fazer o saque 
    const { amount } = request.body;
    //Informação de quanto ele tem de saldo 
    const { customer } = request;

    const balance = getBalance(customer.statement);

    if(balance < amount) {
        return response.status(400).json({error: "Insufficient funds!"})
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit",
    };

    customer.statement.push(statementOperation);

    return response.status(201).send();
});

app.get("/statement/date", verifyExistsAccountCPF, (request, response) => {
    //Recuperando custumer, fazendo desestruturação 
    const { customer } = request;
    const { date } = request.query; 

    //Fazendo a busca da data independente do dia, que fez a transação 
    const dateFormat = new Date(date + " 00:00");

    //Encontrar os state com a data 
    const statement = customer.statement.filter(
        (statement) => 
        statement.created_at.toDateString() === 
        new Date(dateFormat).toDateString()
        );

    return response.json(customer.statement);
}); 

//Vamos permitir a atualizacao do nome, pois o cpf não pode mudar 
app.put("/account", verifyExistsAccountCPF,(request, response) => {
    const { name } = request.body;
    const { customer } = request;

    //Vamos pegar o customer e alterar o nome dele 
    customer.name = name;

    return response.status(201).send();

});

//Fazer um GET para obter os dados da conta 
app.get("/account", verifyExistsAccountCPF,(request, response) => {
    const { customer } = request;
    
    return response.json(customer);

});

app.delete("/account", verifyExistsAccountCPF,(request, response) => {
    const { customer } = request;
    
    //Splice recebe 2 parametros,  1°Onde vai iniciar a remocao 2°Ate onde a gente espera a remocao 
    customers.splice(customer, 1);


    //Vamos ver se deu certo e receber no json os customers que restaram 
    return response.status(200).json(customers);
});

//Verificar quanto a gente tem em conta
app.get("/balance", verifyExistsAccountCPF,(request, response) => {
    const { customer } = request;

    const balance = getBalance(customer.statement);

    return response.json(balance);
});

app.listen(3333);