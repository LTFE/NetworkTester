const fs = require("fs");
const Web3 = require("web3");
const logger = require('./csvLogger')('finalResults','\t');
const web3 = new Web3(new Web3.providers.HttpProvider("HTTP://127.0.0.1:7545"));
const inputFileName = process.argv[2];


async function main() {

    // let file = fs.readFileSync(inputFileName);
    let file = fs.readFileSync('outputFile0.csv');
    let rows = file.toString().split("\n");
    let lowestBlockNumber = Number.MAX_SAFE_INTEGER;
    let highestBlockNumber = -1;

    try {
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];

            if (row.length === 0) {
                continue;
            }
            let elements = row.split('\t');

            let tx = await web3.eth.getTransaction(elements[3]);


            if (tx.blockNumber > highestBlockNumber) {
                highestBlockNumber = tx.blockNumber;
            }
            if (tx.blockNumber < lowestBlockNumber) {
                lowestBlockNumber = tx.blockNumber
            }

            logger(['tx'].concat(elements.concat([tx.from, tx.to, tx.gas, tx.gasPrice])))
        }

        for (let i = lowestBlockNumber; i <= highestBlockNumber; i++){
            let block = await web3.eth.getBlock(i);
            logger(['bl', block.number, block.hash, block.timestamp, block.transactions.join(";")])
        }
    }
    catch (e) {
        console.error(e);
    }

}

main();