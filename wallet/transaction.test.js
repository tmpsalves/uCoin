const Transaction = require('./transaction');
const Wallet = require('./index');
const { verifySignature } = require('../util');
const { REWARD_INPUT, MINING_REWARD } = require('../config');

describe('Transação', () => {
    let transaction, senderWallet, recipient, amount;
    beforeEach(() =>{
        senderWallet = new Wallet();
        recipient = 'recipient-public-key';
        amount = 50;
        transaction = new Transaction({ senderWallet, recipient, amount });
    });
    it('tem uma `id`', () => {
        expect(transaction).toHaveProperty('id');
    });
    //outputMap vai permitir que várias IDs sejam consideradas numa transação
    describe('outputMap', () => {
        it('tem o `outputMap', () => {
            expect(transaction).toHaveProperty('outputMap');
        });
        it('mostra o montante enviado para quem recebe', () => {
            expect(transaction.outputMap[recipient]).toEqual(amount);
        });
        it('mostra o saldo depois de uma transação do `senderWallet`', () => {
            expect(transaction.outputMap[senderWallet.publicKey]).toEqual(senderWallet.balance - amount);
        });
    });
    describe('input', () => {
        it('tem um `input`', () => {
            expect(transaction).toHaveProperty('input');
        });
        it('tem uma `timestamp` no input', () => {
            expect(transaction.input).toHaveProperty('timestamp');
        });
        it('define um `amount` para o `senderWallet` saldo', () => {
            expect(transaction.input.amount).toEqual(senderWallet.balance);
        });
        it('define `address` para o `senderWallet` publicKey', () => {
            expect(transaction.input.address).toEqual(senderWallet.publicKey)
        });
        it('valida o input', () => {
            expect(verifySignature({
                publicKey: senderWallet.publicKey,
                data: transaction.outputMap,
                signature: transaction.input.signature
            })).toBe(true);
        });
    });
    describe('validaTransacao()', () => {
        let errorMock;
        beforeEach(() => {
            errorMock = jest.fn();
            global.console.error = errorMock;
        })
        describe('quando a transação é válida', () => {
            it('retorna verdadeiro', () => {
                expect(Transaction.validTransaction(transaction)).toBe(true)
            })
        });

        describe('quando a transação não é válida', () => {
            describe('e quand a transação do outputMap é inválida', () => {
                it('retorna falso e regista o erro', () => {
                    transaction.outputMap[senderWallet.publicKey] = 999999;
                    expect(Transaction.validTransaction(transaction)).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe('e por fim, quando a validação do input (assinatura) é inválida', () => {
                it('retorna falso e regista o erro', () => {
                    transaction.input.signature = new Wallet().sign('data');
                    expect(Transaction.validTransaction(transaction)).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });
        })
    })
    describe('update()', () => {
        let originalSignature, originalSenderOutput, nextRecipient, nextAmount;

        describe('o montante é inválido', () => {
            it('retorna um erro', () => {
                expect(() => {
                    transaction.update({senderWallet, recipient: 'foo', amount: 999999})
                }).toThrow('montante ultrapassa saldo')
            });
        });

        describe('o montante é válido', () => {
            beforeEach(() => {
                originalSignature = transaction.input.signature;
                originalSenderOutput = transaction.outputMap[senderWallet.publicKey];
                nextRecipient = 'next-recipient';
                nextAmount = 50;
                transaction.update({ senderWallet, recipient: nextRecipient, amount: nextAmount });
            });
            it('passa o valor para o proximo receptor', () => {
                expect(transaction.outputMap[nextRecipient]).toEqual(nextAmount);
            });
            it('subtrai o valor de quem envia', () => {
                expect(transaction.outputMap[senderWallet.publicKey]).toEqual(originalSenderOutput - nextAmount)
            });
            it('mantem o valor enviado igual ao valor recebido', () => {
                expect(Object.values(transaction.outputMap).reduce((total, outputAmount) => total + outputAmount)).toEqual(transaction.input.amount);
            });
            it('revalida a transacao', () => {
                expect(transaction.input.signature).not.toEqual(originalSignature);
            });
            describe('outro montante enviado para o mesmo receptor', () => {
                let addedAmount;
                beforeEach(() => {
                    addedAmount = 80;
                    transaction.update({senderWallet, recipient: nextRecipient, amount: addedAmount});
                });
                it('adiciona montante ao receptor', () => {
                    expect(transaction.outputMap[nextRecipient]).toEqual(nextAmount + addedAmount);
                });
                it('subtrai montante de quem envia', () => {
                    expect(transaction.outputMap[senderWallet.publicKey]).toEqual(originalSenderOutput - nextAmount - addedAmount);
                });
            });

        });

    });
    describe('rewardTransaction()', () => {
        let rewardTransaction, minerWallet;
        beforeEach(() => {
            minerWallet = new Wallet();
            rewardTransaction = Transaction.rewardTransaction({ minerWallet });
        });
        it('cria uma transacao com os dados para premio', () => {
            expect(rewardTransaction.input).toEqual(REWARD_INPUT);
        });
        it('cria uma transacao para o mineiro com `MINING_REWARD`', () => {
            expect(rewardTransaction.outputMap[minerWallet.publicKey]).toEqual(MINING_REWARD);
        })
    })
})