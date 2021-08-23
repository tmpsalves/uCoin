const { mineBlock } = require('./block');
const Transaction = require('../wallet/transaction');
const Block = require('./block');
const { cryptoHash } = require('../util');
const { REWARD_INPUT, MINING_REWARD } = require('../config');
const Wallet = require('../wallet');

class Blockchain {
    constructor() {
        this.chain = [Block.genesis()];
    }
    addBlock({ data }) {
        const newBlock = Block.mineBlock({
            lastBlock: this.chain[this.chain.length-1], 
            data

        });
        this.chain.push(newBlock);
    };

    replaceChain(chain, validateTransactions, onSuccess) {
        if (chain.length <= this.chain.length){
            console.error('A chain tem de ser mais longa')
            return;
        }

        if (!Blockchain.isValidChain(chain)) {
            console.error('A chain tem de ser válida')
            return; 
        }
        if (validateTransactions && !this.validTransactionData({ chain })) {
            console.error('A nova chain tem dados inválidos');
            return;
        }
        if (onSuccess) onSuccess();
        console.log('Sucesso, Chain vai ser trocada por, ', chain);
        this.chain = chain;
    }

    // aplica as 4 regras de segurança para validar uma transação
    validTransactionData({ chain }) {
        for(let i=1; i<chain.length; i++) {
            const block = chain[i];
            const transactionSet = new Set();
            let rewardTransactionCount = 0;

            for (let transaction of block.data) {
                if (transaction.input.address === REWARD_INPUT.address) {
                    rewardTransactionCount += 1;
                    if(rewardTransactionCount > 1) {
                        console.error('Prémio por mineração ultrapassa o limite');
                        return false;
                    };
                    if (Object.values(transaction.outputMap)[0] !== MINING_REWARD) {
                        console.error('Prémio por mineração é inválido');
                        return false;
                    }
                } else {
                    if (!Transaction.validTransaction(transaction)) {
                        console.error('Transação Inválida');
                        return false;
                    }
                    const trueBalance = Wallet.calculateBalance({ 
                        chain: this.chain,
                        address: transaction.input.address
                    });
                    if (transaction.input.amount !== trueBalance) {
                        console.error('Valor inserido é inválido')
                        return false;
                    }
                    if (transactionSet.has(transaction)) {
                        console.error('Uma Transação Idêntica aparece em mais que um bloco');
                        return false;
                    } else {
                        transactionSet.add(transaction);
                    }
                }
            }
        };
        return true;
    };

    static isValidChain(chain) {
        if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())){
            return false;
        };

        for (let i=1; i<chain.length; i++) {
            const { timestamp, lastHash, hash, data, difficulty, nonce } = chain[i];
            const actualLastHash = chain[i-1].hash;
            const lastDifficulty = chain[i-1].difficulty;
            
            if (lastHash !== actualLastHash)
            return false;

            const validatedHash = cryptoHash(timestamp, lastHash, data, nonce, difficulty);
            
            if (hash !== validatedHash)
            return false;

            if (Math.abs(lastDifficulty - difficulty) > 1 )
            return false;

        }
        
        return true;
    }
};

module.exports = Blockchain;