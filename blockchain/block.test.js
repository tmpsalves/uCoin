//testes aplicados às classes Block e GENESIS_DATA
const hexToBinary = require('hex-to-binary');
const Block = require("./block");
const { GENESIS_DATA, MINE_RATE } = require('../config');
const { cryptoHash } = require('../util');

describe('Block', () => {
    const timestamp = 2000;
    const lastHash = 'foo-hash';
    const hash = 'bar-hash';
    const data = ['blockchain', 'data'];
    const nonce = 1;
    const difficulty = 1;
    const block = new Block({ timestamp, lastHash, hash, data, nonce, difficulty });

    // verifica falhas na classe Block
    it('Tem timestamp, lastHash, hash e data', () => {
        expect(block.timestamp).toEqual(timestamp);
        expect(block.lastHash).toEqual(lastHash);
        expect(block.hash).toEqual(hash);
        expect(block.data).toEqual(data);
        expect(block.nonce).toEqual(nonce);
        expect(block.difficulty).toEqual(difficulty);
    });

    // verifica falhas na GENESIS_DATA (config.js)
    describe('genesis()', () => {
        const genesisBlock = Block.genesis();
        //para verificar o resultado do genesisBlock retirar o comentário da linha seguinte
        //console.log('genesisBlock', genesisBlock);

        it('retorna uma instancia Block', () => {
            expect(genesisBlock instanceof Block).toBe(true);
        });
        
        it('devolve dados do bloco genesis', () => {
            expect(genesisBlock).toEqual(GENESIS_DATA);
        });
    });
    // verifica falhas no bloco que permite fazer a mineração
    describe('mineBlock()', () => {
        const lastBlock = Block.genesis();
        const data = 'dados minados';
        const minedBlock = Block.mineBlock({ lastBlock, data });

        it('retorna uma instancia do bloco', () => {
            expect(minedBlock instanceof Block).toBe(true);
        });

        it('define a `lastHash` para se tornar a `hash` do lastBlock', () => {
            expect(minedBlock.lastHash).toEqual(lastBlock.hash);
        });

        it('define a `data`', () => {
            expect(minedBlock.data).toEqual(data);
        });
        it('define `timestamp`', () => {
            expect(minedBlock.timestamp).not.toEqual(undefined);
        });
        it('cria uma `hash` sha-256 com base nos inputs devidamente colocados', () => {
            expect(minedBlock.hash).toEqual(cryptoHash(minedBlock.timestamp, minedBlock.nonce, minedBlock.difficulty, lastBlock.hash, data));
        });
        it('define uma `hash` que esteja de acordo com a dificuldade definida', () => {
            expect(hexToBinary(minedBlock.hash).substring(0, minedBlock.difficulty)).toEqual('0'.repeat(minedBlock.difficulty));
        });
        it('ajusta a dificuldade', () => {
            const possibleResults = [lastBlock.difficulty+1, lastBlock.difficulty-1];
            expect(possibleResults.includes(minedBlock.difficulty)).toBe(true);
        });

    });

    describe('adjustDifficulty()', () => {
        it('aumenta a dificuldade, quando um bloco é minado rapidamente', () => {
            expect(Block.adjustDifficulty({
                originalBlock: block, timestamp: block.timestamp + MINE_RATE - 100
            })).toEqual(block.difficulty+1);
        });
        it('diminui a dificuldade, quando um bloco é minado rapidamente', () => {
            expect(Block.adjustDifficulty({
                originalBlock: block, timestamp: block.timestamp + MINE_RATE + 100
            })).toEqual(block.difficulty-1);
        });
        it ('a dificuldade tem de ter um limite minimo de 1', () => {
            block.difficulty = -1;
            expect(Block.adjustDifficulty({ originalBlock: block })).toEqual(1);
        });
    })
});