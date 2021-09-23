// API DEV.
const bodyParser = require('body-parser');
const express = require('express');
const request = require('request');
const path = require('path');
const Blockchain = require('./blockchain');
const PubSub = require('./app/pubsub');
const TransactionPool = require('./wallet/transaction-pool');
const Wallet = require('./wallet');
const { response } = require('express');
const TransactionMiner = require('./app/transaction-miner');
const { restart } = require('nodemon');
const { getEventListener } = require('events');


//Configuração do REDIS
const isDevelopment = process.env.ENV === 'development';
const REDIS_URL = isDevelopment ? 
    'redis://127.0.0.1:6379' : 
    //'redis://:p19b251ee2f30352af5694050a0b4151d28119e74f787587e036f835c5fbde897@ec2-3-93-123-2.compute-1.amazonaws.com:26329'
    'redis://:p19b251ee2f30352af5694050a0b4151d28119e74f787587e036f835c5fbde897@ec2-44-195-122-102.compute-1.amazonaws.com:28259' //heroku redis address
const DEFAULT_PORT = 3000;
const ROOT_NODE_ADDRESS = `http://localhost:${DEFAULT_PORT}`;

const app = express();
const blockchain = new Blockchain();
const transactionPool = new TransactionPool();
const wallet = new Wallet();
const pubsub = new PubSub({ blockchain, transactionPool, redisUrl: REDIS_URL });
const transactionMiner = new TransactionMiner({ blockchain, transactionPool, wallet, pubsub });





//debug
//setTimeout(() => pubsub.broadcastChain(), 1000);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

// CONFIGURACAO API - HTTP Requests
app.get('/api/blocks', (req, res) => {
    res.json(blockchain.chain);
});

app.get('/api/blocks/length', (req, res) => {
    res.json(blockchain.chain.length);
});

app.get('/api/blocks/:id', (req, res) => {
    const { id } = req.params;
    const { length } = blockchain.chain;
    const blocksReversed = blockchain.chain.slice().reverse();
  
    let startIndex = (id-1) * 5;
    let endIndex = id * 5;
  
    startIndex = startIndex < length ? startIndex : length;
    endIndex = endIndex < length ? endIndex : length;
  
    res.json(blocksReversed.slice(startIndex, endIndex));
  });

app.post('/api/mine', (req, res) => {
    const { data } = req.body;
    blockchain.addBlock({ data });
    pubsub.broadcastChain();
    res.redirect('/api/blocks');
});

app.post('/api/transact', (req, res) => {
    const { amount, recipient } = req.body;
    let transaction = transactionPool.existingTransaction({ inputAddress: wallet.publicKey });
    
    try{
        if (transaction) {
            transaction.update({ senderWallet: wallet, recipient, amount })
        } else {
            transaction = wallet.createTransaction({ recipient, amount, chain: blockchain.chain });
        }

    } catch(error) {
        return res.status(400).json({ type: 'error', message: error.message})
    }

    transactionPool.setTransaction(transaction);
    pubsub.broadcastTransaction(transaction);
    //debug
    //console.log('transactionPool', transactionPool);
    res.json({ type: 'success', transaction });
});

app.get('/api/transaction-pool-map', (req, res) => {
    res.json(transactionPool.transactionMap);

});

app.get('/api/mine-transactions', (req, res) => {
    transactionMiner.mineTransactions();
    res.redirect('/api/blocks');
});
app.get('/api/wallet-info', (req, res) => {
    const address = wallet.publicKey;
    res.json({ 
        address,
        balance: Wallet.calculateBalance({ chain: blockchain.chain, address })
    });
});

app.get('/api/known-addresses', (req, res) => {
    const addressMap = {};
    for (let block of blockchain.chain) {
        for (let transaction of block.data) {
            const recipient = Object.keys(transaction.outputMap);
            recipient.forEach(recipient => addressMap[recipient] = recipient);
        }
    }
    res.json(Object.keys(addressMap));
})

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });

const syncWithRootState = () => {
    request({ url: `${ROOT_NODE_ADDRESS}/api/blocks`}, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            const rootChain = JSON.parse(body);
            console.log('Sincroniza a chain com', rootChain);
            blockchain.replaceChain(rootChain);
        }
    });
    request({ url: `${ROOT_NODE_ADDRESS}/api/transaction-pool-map`}, (error, response, body) => {
        if(!error && response.statusCode === 200) {
            const rootTransactionPoolMap = JSON.parse(body);
            console.log('repoe a transaction pool map a sincronizar com', rootTransactionPoolMap);
            transactionPool.setMap(rootTransactionPoolMap);
        }
    });
}


//adiciona dummy data para testar o frontend
if (isDevelopment) {
    const walletUal = new Wallet();
    const walletProjeto = new Wallet();

    const generateWalletTransaction = ({ wallet, recipient, amount }) => {
        const transaction = wallet.createTransaction({ 
            recipient, amount, chain: blockchain.chain
        });
        transactionPool.setTransaction(transaction);
    };

    const walletAction = () => generateWalletTransaction({
        wallet, recipient: walletUal.publicKey, amount: 5
    });

    const walletUalAction = () => generateWalletTransaction({
        wallet: walletUal, recipient: walletProjeto.publicKey, amount: 10
    });

    const walletProjetoAction = () => generateWalletTransaction({
        wallet: walletProjeto, recipient: wallet.publicKey, amount: 15
    });

    for (let i=0; i<20; i++) {
        if(i%3 === 0) {
            walletAction();
            walletUalAction();
        } else if (i%3 === 0) {
            walletAction();
            walletProjetoAction();
        } else {
            walletUalAction();
            walletProjetoAction();
        }
        transactionMiner.mineTransactions();
    }
}




let PEER_PORT;

if (process.env.GENERATE_PEER_PORT === 'true') {
    PEER_PORT = DEFAULT_PORT + Math.ceil(Math.random() * 1000);
}

const PORT = process.env.PORT || PEER_PORT || DEFAULT_PORT;
app.listen(PORT, () => {
    console.log(`Ligado a localhost:${PORT}`);
    if (PORT !== DEFAULT_PORT) {
    syncWithRootState();
    }
});