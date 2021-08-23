const Wallet = require('./index');
const { verifySignature } = require('../util');
const Transaction = require('./transaction');
const Blockchain = require ('../blockchain');
const { STARTING_BALANCE } = require('../config');

describe('Wallet', () => {
    let wallet;
    beforeEach(() => {
        wallet = new Wallet();
    });
    it('tem `balance`', () => {
        expect(wallet).toHaveProperty('balance')
    });
    it('tem uma `publicKey', () => {
        //debug
        //console.log(wallet.publicKey);
        expect(wallet).toHaveProperty('publicKey');
    });

    describe('assinatura digital do campo data', () => {
        const data = 'foobar';
        it('verifica a assinatura', () => {
            expect(verifySignature({
                publicKey: wallet.publicKey,
                data,
                signature: wallet.sign(data)
            })).toBe(true);

        });
        it('não consegue verificar uma assinatura invalida', () => {
            expect(verifySignature({
                publicKey: wallet.publicKey,
                data,
                signature: new Wallet().sign(data)
            })).toBe(false);
        });
    })
    describe('criaTransacao()', () => {
        describe('o montante excede o saldo actual', () => {
            it('retorna um erro', () => {
                expect(() => wallet.createTransaction({ amount: 999999, recipient: 'foo-recipient'})).toThrow('montante ultrapassa saldo');
            });
        });
        describe('montante está dentro do saldo actual', () => {
            let transaction, amount, recipient;
            beforeEach(() => {
                amount = 50;
                recipient = 'foo-recipient'
                transaction = wallet.createTransaction({ amount, recipient });
            });
            it('cria uma instancia de `Transaction`', () => {
                expect(transaction instanceof Transaction).toBe(true);
            });
            it('o valor da transacao é válida com o saldo na carteira', () => {
                expect(transaction.input.address).toEqual(wallet.publicKey);
            })
            it('mostra o valor transferido para o receptor', () => {
                expect(transaction.outputMap[recipient]).toEqual(amount);
            });
        });
        describe('e a está dentro da chain', () => {
            it('chama `Wallet.calculateBalance', () => {
                const calculateBalanceMock = jest.fn();
                const originalCalculateBalance = Wallet.calculateBalance; // precisamos de fazer este teste para mais tarde usarmos no teste de somatório
                Wallet.calculateBalance = calculateBalanceMock;
                wallet.createTransaction({
                    recipient: 'foo',
                    amount: 10,
                    chain: new Blockchain().chain
                });
                expect(calculateBalanceMock).toHaveBeenCalled;
                Wallet.calculateBalance = originalCalculateBalance;
            });
        });
    });
    describe('calculateBalance()', () => {
        let blockchain;
        beforeEach(() => {
            blockchain = new Blockchain();
        })
        describe('nao tem transacoes processadas', () => {
            it('retorna o `STARTING_BALANCE`', () => {
                expect(
                    Wallet.calculateBalance({
                        chain: blockchain.chain,
                        address: wallet.publicKey
                    })
                ).toEqual(STARTING_BALANCE);
            });
        });
        describe('quando há transacoes processadas', () => {
            let transaction1, transaction2;
            beforeEach(() => {
                transaction1 = new Wallet().createTransaction({
                    recipient: wallet.publicKey,
                    amount: 50
                });
                transaction2 = new Wallet().createTransaction({
                    recipient: wallet.publicKey,
                    amount: 60
                });
                blockchain.addBlock({ data: [transaction1, transaction2] })
            });
            it('faz o somatorio de todas as transacoes efectuadas', () => {
                expect(
                    Wallet.calculateBalance({
                        chain: blockchain.chain,
                        address: wallet.publicKey
                    })
                ).toEqual(STARTING_BALANCE + transaction1.outputMap[wallet.publicKey] + transaction2.outputMap[wallet.publicKey]);
            });
        });
        describe('e a carteira (wallet) fez uma transacao', () => {
            let recentTransaction;
            beforeEach(() => {
                recentTransaction = wallet.createTransaction({
                    recipient: 'alguem',
                    amount: 20
                });
                blockchain.addBlock({ data: [recentTransaction] });
            })
            it('retorna o valor da transacao recente', () => {
                expect(
                    Wallet.calculateBalance({
                        chain: blockchain.chain,
                        address: wallet.publicKey
                    })
                ).toEqual(recentTransaction.outputMap[wallet.publicKey]);
            });
            describe('quano ha outputs antes e depois de uma transacao recente', () => {
                let sameBlockTransaction, nextBlockTransaction;
                beforeEach(() => {
                    recentTransaction = wallet.createTransaction({
                        recipient: 'alguem-que-chegou-mais-tarde',
                        amount: 60
                    });
                    sameBlockTransaction = Transaction.rewardTransaction({ minerWallet: wallet });
                    blockchain.addBlock({ data: [recentTransaction, sameBlockTransaction] });
                    nextBlockTransaction = new Wallet().createTransaction({
                        recipient: wallet.publicKey,
                        amount: 75
                    });
                    blockchain.addBlock({ data: [nextBlockTransaction] });
                });
                it('inclui o valor de output no saldo', () => {
                    expect(
                        Wallet.calculateBalance({
                            chain: blockchain.chain,
                            address: wallet.publicKey
                        })
                    ).toEqual(recentTransaction.outputMap[wallet.publicKey] + sameBlockTransaction.outputMap[wallet.publicKey] + nextBlockTransaction.outputMap[wallet.publicKey]);
                });
            });
        });
    });
});