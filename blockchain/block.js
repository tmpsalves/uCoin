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
        this.difficulty = difficulty; //define o número de zeros necessários
    }
    // bloco génese (genesis em inglês)
    static genesis() {
        return new this(GENESIS_DATA);

    }
    // bloco minerado
    static mineBlock({ lastBlock, data }) {
        const lastHash = lastBlock.hash;
        let hash, timestamp;
        let { difficulty } = lastBlock; // dificuldade necessita de considerar o último bloco minerado
        let nonce = 0; // nonce tera que se ajustar à dificuldade

        // proof of work
        // incrementa o valor do nonce até que o valor seja o esperado
        do {
            nonce++;
            timestamp = Date.now(); // regista a data do bloco válido
            difficulty = Block.adjustDifficulty({ originalBlock: lastBlock, timestamp});
            hash = cryptoHash(timestamp, lastHash, data, nonce, difficulty); // encripta a hash
        } while (hexToBinary(hash).substring(0, difficulty) !== '0'.repeat(difficulty)); //incrementa zeros de acordo com a dificuldade e converte a hash criada em binário para hexadecimal

        return new this({timestamp, lastHash, data, difficulty, nonce, hash}); //retorna um novo bloco
    }
    // ajuste da dificuldade de forma dinânica
    // caso o bloco esteja a ser minerado mais rápido que o esperado, aumenta a dificuldade
    // caso contrário diminui a dificuldade
    static adjustDifficulty({ originalBlock, timestamp }) {
        
        const {difficulty} = originalBlock;
        // caso a dificuldade diminua para valores negativos (blocos a serem minerados mais rápido que o esperado)
        // retorna sempre 1
        if(difficulty < 1) 
        return 1;

        if ((timestamp - originalBlock.timestamp) > MINE_RATE)
        return difficulty - 1;
        return difficulty + 1;
    }
}

module.exports = Block;

