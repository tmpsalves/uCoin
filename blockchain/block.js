const hexToBinary = require('hex-to-binary');
const { GENESIS_DATA, MINE_RATE } = require('../config');
const { cryptoHash } = require('../util');

// cria a classe Block e respectivos construtores
class Block {
    constructor({timestamp, lastHash, hash, data, nonce, difficulty}) {
        this.timestamp = timestamp;
        this.lastHash = lastHash;
        this.hash = hash;
        this.data = data;
        this.nonce = nonce;
        this.difficulty = difficulty;
    }
    // bloco génese (genesis em inglês)
    static genesis() {
        return new this(GENESIS_DATA);

    }
    // bloco minado
    static mineBlock({ lastBlock, data }) {
        const lastHash = lastBlock.hash;
        let hash, timestamp;
        let { difficulty } = lastBlock;
        let nonce = 0;

        // proof of work
        do {
            nonce++;
            timestamp = Date.now();
            difficulty = Block.adjustDifficulty({ originalBlock: lastBlock, timestamp});
            hash = cryptoHash(timestamp, lastHash, data, nonce, difficulty);
        } while (hexToBinary(hash).substring(0, difficulty) !== '0'.repeat(difficulty));

        return new this({timestamp, lastHash, data, difficulty, nonce, hash});
    }
    // ajuste da dificuldade de forma dinânica
    // caso o bloco esteja a ser minado mais rápido que o esperado, aumenta a dificuldade
    // caso contrário diminui a dificuldade
    static adjustDifficulty({ originalBlock, timestamp }) {
        
        const {difficulty} = originalBlock;
        // caso a dificuldade diminua para valores negativos (blocos a serem minados mais rápido que o esperado)
        // retorna sempre 1
        if(difficulty < 1) 
        return 1;

        if ((timestamp - originalBlock.timestamp) > MINE_RATE)
        return difficulty - 1;
        return difficulty + 1;
    }
}

module.exports = Block;

