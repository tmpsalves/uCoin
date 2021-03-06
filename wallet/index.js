const Transaction = require('./transaction');
const { STARTING_BALANCE } = require('../config');
const { ec, cryptoHash } = require('../util');

class Wallet {
    constructor() {
        this.balance = STARTING_BALANCE; //variavel global
        this.keyPair = ec.genKeyPair(); // elliptic para criar os pares de chaves
        this.publicKey = this.keyPair.getPublic().encode('hex'); //criacao do endereco publico (address)
    }
    sign(data) {
        return this.keyPair.sign(cryptoHash(data)) //funciona melhor com apenas uma unica hash

    }
    // cria uma transacao, e prepara o metodo para não efetuar transacoes caso nao haja saldo
    createTransaction({ recipient, amount, chain }){
        if (chain) {
            this.balance = Wallet.calculateBalance({
                chain,
                address: this.publicKey
            });
        }

        if (amount > this.balance) {
            throw new Error('montante ultrapassa saldo');
        }
        return new Transaction({ senderWallet: this, recipient, amount });
    }
    //calcula o saldo 
    static calculateBalance({ chain, address }) {
        let hasConductedTransaction = false;
        let outputsTotal = 0;
        for (let i=chain.length-1; i>0; i--) { // começamos pelo fim da chain, e deixamos que i seja maior que zero porque não queremos calcular o bloco genesis 
            const block = chain[i];
            for (let transaction of block.data) {
                if (transaction.input.address === address) {
                    hasConductedTransaction = true;
                }
                const addressOutput = transaction.outputMap[address];
                if(addressOutput) {
                    outputsTotal = outputsTotal + addressOutput
                }
            }
            if(hasConductedTransaction) {
                break;
            }
        }
        return hasConductedTransaction ? outputsTotal:
        STARTING_BALANCE + outputsTotal;
    }
}



module.exports = Wallet;