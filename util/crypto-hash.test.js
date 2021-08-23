const cryptoHash = require('./crypto-hash');

// O objectivo é testar se a classe cryptoHash está a criar uma hash em sha-256
describe('cryptoHash()', () => {
    it('gera uma hash SHA-256 como output', () => {
        expect(cryptoHash('foo')).toEqual('b2213295d564916f89a6a42455567c87c3f480fcd7a1c15e220f17d7169a790b');
    });
    it('produz a hash esperada com os argumentos de entrada independetemente da ordem', () => {
        expect(cryptoHash('um', 'dois', 'tres')).toEqual(cryptoHash('tres', 'um', 'dois'));
    });
    it('produz uma hash unica quando as propriedadades inseridas foram alteradas', () => {
        const foo = {};
        const originalHash = cryptoHash(foo);
        foo['a'] = 'a';
        expect(cryptoHash(foo)).not.toEqual(originalHash);
    })
});

