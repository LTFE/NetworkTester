const Web3 = require('web3');
const getWeb3 = initWeb3Provider();
const web3 = getWeb3();


function initWeb3Provider() {
    if (process.env.WEB3_CONNECTION_TYPE === "ipc") {
        const ipcpath = process.env.WEB3_IPC_PATH || `${require('os').userInfo().homedir}/.ethereum/testnet/geth.ipc`,
            net = require('net');
        console.log('using IPC provider at:', ipcpath);
        return () => new Web3(new Web3.providers.IpcProvider(ipcpath, net))
    }
    else if (process.env.WEB3_CONNECTION_TYPE === "ws") {
        const wsAddr = process.env.WEB3_WS_ADDR || 'wss://ropsten.infura.io/ws';
        console.log('using WS provider at:', wsAddr);
        return () => new Web3(new Web3.providers.WebsocketProvider(wsAddr));
    }
    else {
        console.error('invalid web3 connection type', process.env.WEB3_CONNECTION_TYPE);
        process.exit(1);
    }
}

web3.eth.getBlockNumber((err, block) => console.log("current block:", block));

module.exports = web3;