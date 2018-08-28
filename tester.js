const argv = require("minimist")(process.argv.slice(2));
checkArgv();

const Web3 = require("web3");

const fs = require("fs-extra");
const files = argv.inputFiles;
const outputFileName = argv.o;
const tmpFileName = outputFileName + "_tmp";
// const web3 = new Web3(new Web3.providers.HttpProvider("HTTP://swether.ltfe.org:7545"));
const web3 = new Web3(new Web3.providers.HttpProvider("HTTP://127.0.0.1:7545"));

let addresses, nonces;

const timeout = ms => new Promise(res => setTimeout(res, ms));

function randomInt(totalNumbers){
    return (Math.floor(Math.random()*totalNumbers))
}

function checkArgv() {

    if(argv.h){
        console.log("Usage\n" +
            "\t-h\tGet help\n" +
            "\t-i\tSpecify input IAT file names with a space-separated string. These files will be taken from the \"tests\" folder\n" +
            "\t-o\tSpecify output file name"
            // "\t-b\tThe number of empty blocks that should pass before the analysis phase begins. Default 10"
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

    if(typeof argv.i !== "string" || argv.o.length === 0){
        console.log("No IAT files. Please specify IAT files with the \"-o\" option");
        process.exit(1);
    }
    else {
        argv.inputFiles = argv.i.split(" ");
        console.log("IAT files: ", argv.inputFiles);
    }

    if(typeof argv.b !== "number"){
        argv.b = 10;
    }
}


async function test(file, delays, logger) {
    return new Promise(async (resolve, reject) => {
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
        resolve();
    });
}

async function startTest() {
    return new Promise(async (resolve, reject) => {
        // console.log("Using files:", files);
        const logger = require('./csvLogger')(tmpFileName, '\t');

        addresses = await web3.eth.getAccounts();
        nonces = [];
        for (let addr of addresses) {
            nonces.push(await web3.eth.getTransactionCount(addr))
        }
        let tests = [];
        
        console.log("Starting tests");
        
        for (let file of files) {
            try {
                let data = await fs.readFile(__dirname + "/tests/" + file);
                tests.push(test(file, data.toString().split("\r\n").map(e => parseInt(e)), logger));
            }
            catch (e){
                if (e.code === 'EISDIR') return;
                console.error(arguments)
            }
        }
        Promise.all(tests).then(resolve);
    })
}

async function analyze() {
    let file;
    try {
        file = await fs.readFile(`${__dirname}/${tmpFileName}0.tsv`);
    }
    catch (e) {
        console.error("Error reading tmp file");
        console.error(e);
    }
    const txLogger = require('./csvLogger')(outputFileName + "Tx", '\t');
    const blLogger = require('./csvLogger')(outputFileName + "Bl", '\t');

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
            let receipt = await web3.eth.getTransactionReceipt(elements[3]);
            let block = await web3.eth.getBlock(tx.blockNumber);

            if (tx.blockNumber > highestBlockNumber) {
                highestBlockNumber = tx.blockNumber;
            }
            if (tx.blockNumber < lowestBlockNumber) {
                lowestBlockNumber = tx.blockNumber
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

async function waitEmptyBlocks(numberOfBlocks) {

}

async function main() {
    try {
        await fs.unlink(`${__dirname}/${tmpFileName}0.tsv`);
    }
    catch (e) {
        
    }
    
    await startTest();
    console.log("Tests done. Waiting for transactions to be processed before getting extra data");
    await timeout("5000");
    await analyze();
    await fs.unlink(`${__dirname}/${tmpFileName}0.tsv`);
    console.log("Data ready");
}

main();
