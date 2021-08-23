// modulo nodejs para criptografia https://nodejs.org/api/crypto.html
// https://nodejs.org/en/knowledge/cryptography/how-to-use-crypto-module/
// modulo para melhorar a dificuldade de mineração de blocos
// https://github.com/AVVS/hex-to-binary
const crypto = require('crypto');
//const hexToBinary = require('hex-to-binary');

const cryptoHash = (...inputs) => {
    // utilizar o modulo crypto para criar a hash
    const hash = crypto.createHash('sha256');
    hash.update(inputs.map(input => JSON.stringify(input)).sort().join(' '));
    return hash.digest('hex'); //hexToBinary(
};

module.exports = cryptoHash;