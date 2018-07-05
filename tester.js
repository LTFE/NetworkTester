const fs = require("fs");
const files = fs.readdirSync("./tests");
const Web3 = require("web3");
const logger = require('./csvLogger')('testerOutput', '\t');
const timeout = ms => new Promise(res => setTimeout(res, ms));
const web3 = new Web3(new Web3.providers.HttpProvider("HTTP://127.0.0.1:7545"));

let addresses, nonces;


function randomInt(totalNumbers){
    return (Math.floor(Math.random()*totalNumbers))
}

async function main() {
    console.log("Using files:", files);

    addresses = await web3.eth.getAccounts();
    nonces = [];
    for (let addr of addresses) {
        nonces.push(await web3.eth.getTransactionCount(addr))
    }
    for (let file of files) {
        fs.readFile("./tests/" + file, (err, data) => {
            if(err){
                if(err.code === 'EISDIR') return;
                console.error(arguments)

            }
            test(file, data.toString().split("\r\n").map(e => parseInt(e)));
        });
    }



}

async function test(file, delays) {
    for(const delay of delays) {
        let sent = new Date();
        let originAddrNumber = randomInt(addresses.length);
        web3.eth.sendTransaction({
            from: addresses[originAddrNumber],
            to: addresses[randomInt(addresses.length)],
            value: 0,
            gas: 10e5,
            nonce: nonces[originAddrNumber],
            gasPrice: 1
        }, function (err, txHash) {
            if(err) {
                console.error(err);
            }
            logger([sent.getTime(), new Date().getTime(), file, txHash])
        });
        nonces[originAddrNumber]++;
        await timeout(delay)
    }
}

main();

console.log("");