const Blockchain = require('./index');
const Block = require('./block');
const { cryptoHash }  = require('../util');
const Wallet = require('../wallet');
const Transaction = require('../wallet/transaction');

describe('Blockchain', () => {
    let blockchain, newChain, originalChain, errorSim;

    beforeEach(() =>{
        blockchain = new Blockchain();
        newChain = new Blockchain();
        errorSim = jest.fn();
        originalChain = blockchain.chain;
        global.console.error = errorSim
    });
    
    it('contem uma `chain` criada em Array', () => {
        expect(blockchain.chain instanceof Array).toBe(true);
    });
    it('tudo começa com o bloco `genesis`', () => {
        expect(blockchain.chain[0]).toEqual(Block.genesis());
    });
    it('adiciona um novo bloco à chain', () => {
        const newData = 'foo bar';
        blockchain.addBlock({ data: newData });

        expect(blockchain.chain[blockchain.chain.length-1].data).toEqual(newData);
    });
    // ver isValidChain @blockchain.js
    describe('isValidChain()', () => {
        beforeEach(() => {
            blockchain.addBlock({ data: 'Laboratorio' });
            blockchain.addBlock({ data: 'Projecto' });
            blockchain.addBlock({ data: 'UAL' });
        });

        describe('quando uma chain não inicia com o bloco genesis', () => {
            it('devolve falso', () => {
                blockchain.chain[0] = { data: 'genesis-falso' };
                expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
            });
        });
        describe('quando uma chain começa com o bloco genesis e tem vários blocos', () => {
            describe('e a lastHash sofreu alterações', () => {
                it('devolve falso', () => {
                    blockchain.chain[2].lastHash = 'lastHash inválida';
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });
            describe('e a chain contem um bloco com um campo inválido', () => {
                it('retorna falso', () => {
                    blockchain.chain[2].data = 'Dados que não deviam estar aqui';
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });
            describe('quando a blockchain contem um bloco "viciado" em termos de dificuldade', () => {
                it('retorna falso', () => {
                    const lastBlock = blockchain.chain[blockchain.chain.length-1];
                    const lastHash = lastBlock.hash;
                    const timestamp = Date.now();
                    const nonce = 0;
                    const data = [];
                    const difficulty = lastBlock.difficulty - 3;
                    const hash = cryptoHash(timestamp, lastHash, difficulty, nonce, data);
                    const badBlock = new Block({ timestamp, lastHash, hash, nonce, difficulty, data});
                    blockchain.chain.push(badBlock);
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });
            describe('e por fim, caso a chain não tenha qualquer tipo de bloco inválido', () => {
                it('retorna verdadeiro', () => {
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(true);
                });
            })
        })
    });
    // ver replaceChain @index.js
    describe('replaceChain()', () => {
        let logSim;
        
        beforeEach(() =>{
        logSim = jest.fn();

        global.console.log = logSim;
    });

        describe('quando a nova chain não é longa o suficiente', () => {
            beforeEach(() => {
                newChain.chain[0] = { new: 'chain' };
                blockchain.replaceChain(newChain.chain);
            })
            it('não faz o replacement da chain', () => {
                expect(blockchain.chain).toEqual(originalChain);
            });
            it('mostra um erro', () => {
                expect(errorSim).toHaveBeenCalled();
            })
        });
        describe('quando a nova chain é longa', () => {
            beforeEach(() => {
                newChain.addBlock({ data: 'Laboratorio' });
                newChain.addBlock({ data: 'Projecto' });
                newChain.addBlock({ data: 'UAL' });
            });
            describe('e é inválida', () => {
                beforeEach(() => {
                    newChain.chain[2].hash = 'hash falsa';
                    blockchain.replaceChain(newChain.chain);
                });
                it('não faz o replace à chain', () => {
                    expect(blockchain.chain).toEqual(originalChain);
                });
                it('mostra um erro', () => {
                    expect(errorSim).toHaveBeenCalled();
                });

            });
            describe('e é válida', () => {
                beforeEach(() => {
                    blockchain.replaceChain(newChain.chain);
                })
                it('faz replace à chain', () => {
                    expect(blockchain.chain).toEqual(newChain.chain);
                });
                it('mostra o resultado', () => {
                    expect(logSim).toHaveBeenCalled();
                });
            });
        });
        describe('quando a `validateTransactions` é verdadeira', () => {
            it('chama a validTransactionData()', () => {
                const validTransactionDataMock = jest.fn();
                blockchain.validTransactionData = validTransactionDataMock
                newChain.addBlock({ data: 'foo' })
                blockchain.replaceChain(newChain.chain, true)
                expect(validTransactionDataMock).toHaveBeenCalled()
            });
        });
    });
    describe('validTransactionData()', () => {
        let transaction, rewardTransaction, wallet;

        beforeEach(() => {
            wallet = new Wallet();
            transaction = wallet.createTransaction({ recipient: 'alguem', amount: 65 });
            rewardTransaction = Transaction.rewardTransaction({ minerWallet: wallet });
        });
        describe('transacao e valida', () => {
            it('retorna verdadeiro', () => {
                newChain.addBlock({ data: [transaction, rewardTransaction] });
                expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(true);
                expect(errorSim).not.toHaveBeenCalled();
            });
        });
        describe('transacao tem multiplos premios', () => {
            it('retorna falso, e regista o erro', () => {
                newChain.addBlock({ data: [transaction, rewardTransaction, rewardTransaction]});
                expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
                expect(errorSim).toHaveBeenCalled();
            })
        })
        describe('transacao tem pelo menos um output mal formado', () => {
            describe('e transacao nao tem premio', () => {
                it('retorna falso, e regista o erro', () => {
                    transaction.outputMap[wallet.publicKey] = 999999;
                    newChain.addBlock({ data: [transaction, rewardTransaction] });
                    expect(blockchain.validTransactionData({ chain: newChain.chain})).toBe(false);
                    expect(errorSim).toHaveBeenCalled();
                });
            });
            describe('e a transacao tem um premio', () => {
                it('retorna falso, e regista o erro', () => {    
                    rewardTransaction.outputMap[wallet.publicKey] = 999999;
                    newChain.addBlock({ data: [transaction, rewardTransaction] });
                    expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
                    expect(errorSim).toHaveBeenCalled();         
                });
            });
        });
        describe('transaco tem pelo menos um input mal formado', () => {
            it('retrona falso, e regista o erro', () => {
                wallet.balance = 9000;
                
                const evilOutputMap = {
                    [wallet.publicKey]: 8900,
                    fooRecipient: 100
                };
                const evilTransaction = {
                    input: {
                        timestamp: Date.now(),
                        amount: wallet.balance,
                        address: wallet.publicKey,
                        signature: wallet.sign(evilOutputMap)
                    },
                    outputMap: evilOutputMap
                }
                newChain.addBlock({ data: [evilTransaction, rewardTransaction] });
                expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
                expect(errorSim).toHaveBeenCalled();
            });
        })
        describe('e um bloco contem mais que uma transacao identica', () => {
            it('retorna falso, e regista o erro', () => {
                newChain.addBlock({
                    data: [ transaction, transaction, transaction, rewardTransaction]
                });
                expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false)
                expect(errorSim).toHaveBeenCalled();
            });
        });
    });
});