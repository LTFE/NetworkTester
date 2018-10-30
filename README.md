# [Ethereum] Network Tester

Currently set up to connect to an Ethereum node at `HTTP://127.0.0.1:7545` (Ganache)

### Procedure

Put files containing the IAT times into the `tests` folder. It should contain one IAT (in milliseconds) per line. Use the example file as a reference. Each of these files will be treated separately.

Run `node tester.js` to run the test, using -i to specify the IAT files, and, optionally -o to specify the output file name. You can follow its progress in the Ganache console.

For a full list of options, run `node tester.js -h`.

Example input: `node tester.js -o myOutputFile -i "constantLoad.txt onePerMinute.txt randomIAT.txt customIAT.txt"`

#### Format

Data about blocks and transactions is gathered into separate files.

##### Transaction

- the moment the sendTransaction function is called
- the moment the transaction hash is received
- test file name
- txHash
- sender
- receiver
- gas
- gas used
- gas price
- block timestamp
- block number
- block hash

##### Block

- block number
- block hash
- block timestamp
- transaction hashes, separated by `;`

#### Notes

The serial numbers are only use to prevent overwriting of previous test results


