const TransactionPool = require('./transaction-pool');
const Transaction = require('./transaction');
const Wallet = require('./index');
const Blockchain = require('../blockchain');

describe('TransactionPool()', () => {
    let transactionPool, transaction, senderWallet;
    beforeEach(() => {
        transactionPool = new TransactionPool();
        senderWallet = new Wallet();
        transaction = new Transaction({
            senderWallet,
            recipient: 'alguem',
            amount: 50
        });
    });
    describe('setTransaction()', () => {
        it('adiciona uma transacao', () => {
            transactionPool.setTransaction(transaction);
            expect(transactionPool.transactionMap[transaction.id]).toBe(transaction);
        });
    });
    describe('existingTransaction()', () => {
        it('retorna uma transacao considerando um endereco cedido', () => {
            transactionPool.setTransaction(transaction);
            expect(
            transactionPool.existingTransaction({ inputAddress: senderWallet.publicKey})).toBe(transaction);
        });
    });
    describe('validTransactions()', () => {
        let validTransactions, errorMock;
        beforeEach(() => {
            validTransactions = [];
            errorMock = jest.fn();
            global.console.error = errorMock;

            for (let i=0; i<10; i++) {
                transaction = new Transaction({
                    senderWallet,
                    recipient: 'alguem',
                    amount: 30
                });
                if (i%3===0) {
                    transaction.input.amount = 999999;
                } else if (i%3===1) {
                    transaction.input.signature = new Wallet().sign('foo');
                } else {
                    validTransactions.push(transaction);
                }
                transactionPool.setTransaction(transaction);
            }
        });
        it('retorna uma transacao válida', () => {
            expect(transactionPool.validTransactions()).toEqual(validTransactions);
        });
        it('regista erros para as transacoes inválidas', () => {
            transactionPool.validTransactions();
            expect(errorMock).toHaveBeenCalled();
        });
    })
    describe('clear()', () =>{
        it('limpa as transacoes', () => {
            transactionPool.clear();
            expect(transactionPool.transactionMap).toEqual({});
        });
    });
    describe('clearBlockChainTransactions()', () => {
        it('limpa a pool de qualquer transacao existente na blockchain', () => {
            const blockchain = new Blockchain();
            const expectedTransactionMap = {};

            for (let i=0; i<6; i++) {
                const transaction = new Wallet().createTransaction({
                    recipient: 'foo', amount: 20
                });

                transactionPool.setTransaction(transaction);

                if(i%2===0) {
                    blockchain.addBlock({ data: [transaction] })
                } else {
                    expectedTransactionMap[transaction.id] = transaction;
                }
            }
            transactionPool.clearBlockchainTransactions({ chain: blockchain.chain });
            expect(transactionPool.transactionMap).toEqual(expectedTransactionMap);

        })
    })
});