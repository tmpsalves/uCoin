// local onde irei guardar os valores globais
const MINE_RATE = 1000;
const INITIAL_DIFFICULTY = 3;

const GENESIS_DATA = {
    timestamp: 1,
    lastHash: '-nulo-',
    hash: 'O início',
    difficulty: INITIAL_DIFFICULTY,
    nonce: 0,
    data: []
};

const REWARD_INPUT = { address: '*prémio-autorizado*' };
const MINING_REWARD = 50;

const STARTING_BALANCE = 1000;

module.exports = { GENESIS_DATA, MINE_RATE, STARTING_BALANCE, REWARD_INPUT, MINING_REWARD };