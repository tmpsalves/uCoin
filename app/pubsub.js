//configuração do REDIS
//O objectivo é fazer broadcast da blockchain para os peers que querem entrar na rede.

const redis = require('redis');

const CHANNELS = {
    TEST: 'TEST',
    BLOCKCHAIN: 'BLOCKCHAIN',
    TRANSACTION: 'TRANSACTION'
};

class PubSub {
    constructor({ blockchain, transactionPool, redisUrl }) {
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;
        this.publisher = redis.createClient(redisUrl);
        this.subscriber = redis.createClient(redisUrl);
        this.subscribeToChannels();
        this.subscriber.on('message', (channel, message) => this.handleMessage(channel, message));
    }
    handleMessage(channel, message) {
        console.log(`Mensagem recebida. Canal: ${channel}. Mensagem: ${message}.`)
        const parsedMessage = JSON.parse(message);

        switch(channel) {
            case CHANNELS.BLOCKCHAIN:
                this.blockchain.replaceChain(parsedMessage, true, () => {
                    this.transactionPool.clearBlockchainTransactions({
                        chain: parsedMessage
                    }); //limpa a transaction pool de todos os peers conectados
                });
                break;
            case CHANNELS.TRANSACTION:
                this.transactionPool.setTransaction(parsedMessage);
                break;
            default:
                return;
        }

    }

    subscribeToChannels() {
        Object.values(CHANNELS).forEach(channel => {
            this.subscriber.subscribe(channel);
        });
    }
    publish({ channel, message }) {
        this.subscriber.unsubscribe(channel, () => {
            this.publisher.publish(channel, message, () => {
                this.subscriber.subscribe(channel);
            });
        });
    }
    broadcastChain() {
        this.publish ({
            channel: CHANNELS.BLOCKCHAIN,
            message: JSON.stringify(this.blockchain.chain)
        });
    }

    broadcastTransaction(transaction) {
        this.publish({
            channel: CHANNELS.TRANSACTION,
            message: JSON.stringify(transaction)
        });
    }
}

//debug
//const testPubSub = new PubSub();
//setTimeout(() => testPubSub.publisher.publish(CHANNELS.TEST, 'Teste'), 1000);

module.exports = PubSub;