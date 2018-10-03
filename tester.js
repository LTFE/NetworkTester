const argv = require("minimist")(process.argv.slice(2));
checkArgv();

const Web3 = require("web3");

const path = require("path");
const fs = require("fs-extra");
const files = argv.inputFiles;
const outputFileName = argv.o;
const tmpFileName = (outputFileName + "_tmp");
const fullTmpFile = argv.a || path.join(__dirname, tmpFileName + "0.tsv");
// const web3 = new Web3(new Web3.providers.HttpProvider("HTTP://swether.ltfe.org:7545"));
const web3 = new Web3(new Web3.providers.HttpProvider("http://193.138.63.98:42800"));


let addresses, nonces, totalTransactions = 0,
    sentTransactions = 0;

const timeout = ms => new Promise(res => setTimeout(res, ms));
const usedAccounts = [-1, -1, -1];

function nextAccount() {
    let nextInt = randomInt(addresses.length);
    while (usedAccounts.includes(nextInt)){
        nextInt = randomInt(addresses.length);
    }
    usedAccounts.push(nextInt);
    usedAccounts.shift();
    return nextInt;
}

function randomInt(totalNumbers){
    return (Math.floor(Math.random()*totalNumbers))
}

function checkArgv() {

    if(argv.h){
        console.log("Usage\n" +
            "\t-h\tGet help\n" +
            "\t-i\tSpecify input IAT file names with a space-separated string. These files will be taken from the \"tests\" folder\n" +
            "\t-o\tSpecify output file name" +
            "\t-b\tThe number of empty blocks that should pass before the analysis phase begins. Default 5" +
            "\t-a\tAnalyze the provided file. This will not run any tests. Still uses -o"
        );
        console.log();
        console.log(
            "Tx column order:\n\t" +
            "Time sent\n\t" +
            "Time got TxHash\n\t" +
            "Origin IAT file\n\t" +
            "TxHash\n\t" +
            "From account\n\t" +
            "To account\n\t" +
            "Max gas\n\t" +
            "Gas used\n\t" +
            "Gas price\n\t" +
            "Block timestamp\n\t" +
            "Block number\n\t"+
            "Block hash"
        );
        console.log();
        console.log(
            "Block column order:\n\t" +
            "Timestamp\n\t" +
            "Block number\n\t" +
            "Block hash\n\t" +
            "Transactions\n\t"
        );

        process.exit(0);
    }

    if(typeof argv.o !== "string" || argv.o.length === 0){
        console.log("No output file name specified. Using \"testerOutput\"");
        argv.o = "testerOutput";
    }
    else {
        console.log("Output file name: " + argv.o);
    }

    if(argv.a && typeof argv.a === "string"){
        console.log("Tester running in analysis mode. Using file:" + argv.a);
        return;
    }

    if(typeof argv.i !== "string" || argv.o.length === 0){
        console.log("No IAT files. Please specify IAT files with the \"-o\" option");
        process.exit(1);
    }
    else {
        argv.inputFiles = argv.i.split(" ");
        console.log("IAT files: ", argv.inputFiles);
    }

    if(typeof argv.b !== "number"){
        argv.b = 5;
    }
}

function checkProgress() {
    if ((sentTransactions % Math.floor(totalTransactions/20) === 0)) {
        console.log(`${Math.round(100*sentTransactions/totalTransactions)}% (${sentTransactions}/${totalTransactions})`)
    }
}

async function test(file, delays, logger) {
    return new Promise(async (resolve, reject) => {
        totalTransactions += delays.length;

        for(const delay of delays) {
            let sent = new Date();
            let originAddrNumber = nextAccount();

            // console.log(originAddrNumber, usedAccounts);

            try {
                nonces[originAddrNumber]++;
                web3.eth.sendTransaction({
                    from: addresses[originAddrNumber].address,
                    to: addresses[randomInt(addresses.length)].address,
                    value: 0,
                    gas: 10e5,
                    nonce: nonces[originAddrNumber],
                    gasPrice: 1
                }, function (err, txHash) {
                    if (err) {
                        console.error(err);
                    }
                    logger([sent.getTime(), new Date().getTime(), file, txHash])
                });

                sentTransactions++;
                checkProgress();
                await timeout(delay);
            }
            catch (e) {
                console.log("error sending transaction");
                console.log(e);
            }
        }
        resolve();
    });
}

async function startTest() {
    return new Promise(async (resolve, reject) => {
        // console.log("Using files:", files);
        const logger = require('./csvLogger')(tmpFileName, '\t');

        addresses = web3.eth.accounts.wallet;
        nonces = new Array(addresses.length);
        nonces.fill(0);
        let tests = [];


        for (let file of files) {
            let filePath;
            try {
                filePath = path.join(__dirname, "tests", file);
                let data = await fs.readFile(filePath);

                tests.push(test(file, data.toString().split("\n").map(e => parseInt((e.trim()))), logger));
            }
            catch (e){
                console.error("Can't find IAT file " + file);
                console.error("Path: ", filePath);
            }
        }
        Promise.all(tests).then(resolve);
    })
}

async function analyze() {
    let file, rows;
    try {
        file = await fs.readFile(fullTmpFile);
        rows = file.toString().split("\n");
    }
    catch (e) {
        console.error("Error reading tmp file");
        console.error(e);
    }



    const txLogger = require('./csvLogger')(outputFileName + "Tx", '\t');
    const blLogger = require('./csvLogger')(outputFileName + "Bl", '\t');


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
            let receipt = await web3.eth.getTransactionReceipt(elements[3]);
            let block = await web3.eth.getBlock(tx.blockNumber);

            if (tx.blockNumber > highestBlockNumber) {
                highestBlockNumber = tx.blockNumber;
            }
            if (tx.blockNumber < lowestBlockNumber) {
                lowestBlockNumber = tx.blockNumber;
            }

            txLogger(elements.concat([tx.from, tx.to, tx.gas, receipt.gasUsed, tx.gasPrice, block.timestamp*1000, tx.blockNumber, tx.blockHash]));

        }

        for (let i = lowestBlockNumber; i <= highestBlockNumber; i++){
            let block = await web3.eth.getBlock(i);
            blLogger([block.timestamp*1000, block.number, block.hash, block.transactions.join(";")])
        }
    }
    catch (e) {
        console.error(e);
    }

}

async function createAccounts(numberOfAccounts) {
    return new Promise(async (resolve, reject) => {
        try {
            web3.eth.accounts.wallet.create(numberOfAccounts);
            resolve();
        }
        catch (e) {
            reject(e)
        }
    })
}

async function waitEmptyBlocks(numberOfBlocks) {
    return new Promise(async function (resolve, reject) {
        let numberOfEmptyBlocks = 0,
            highestBlockNumber = -1;

        while (numberOfEmptyBlocks < numberOfBlocks){
            await timeout(2000);
            let block;
            try {
                let blockNumber = await web3.eth.getBlockNumber();
                if(blockNumber <= highestBlockNumber) continue;
                highestBlockNumber = blockNumber;
                block = await web3.eth.getBlock(highestBlockNumber);
            }
            catch (e) {
                console.error("Can't get block info while waiting for empty blocks");
                console.error(e);
            }

            if(block.transactions.length === 0){
                numberOfEmptyBlocks ++;
            }
            else {
                numberOfEmptyBlocks = 0;
            }
        }
        resolve();
    })

}

async function main() {
    if(argv.a){
        console.log(`Started analyzing transactions at ${new Date()}`);
        await analyze();
        console.log(`Data ready at ${new Date()}`);
        return;
    }



    try {
        await fs.unlink(fullTmpFile);
    }
    catch (e) {

    }
    console.log('Creating accounts');
    await createAccounts(10);
    console.log(`Starting tests at ${new Date()}`);
    await startTest();
    console.log(`Tests done at ${new Date()}. Waiting for the transactions to be processed before analyzing them`);
    // await waitEmptyBlocks(argv.b);
    await timeout(10*1000);
    console.log(`Started analyzing transactions at ${new Date()}`);
    await analyze();
    try {
        await fs.unlink(fullTmpFile);
    }
    catch (e) {
        console.log("Couldn't clean up tmp file");
        console.error(e);
    }
    console.log(`Data ready at ${new Date()}`);
}

main();
