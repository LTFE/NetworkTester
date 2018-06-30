# [Ethereum] Network Tester

Currently set up to connect to an Ethereum node at `HTTP://127.0.0.1:7545` (Ganache)

### Procedure

Put files containing the IAT times into the `tests` folder. It should contain one IAT (in milliseconds) per line. Use the example file as a reference. Each of these files will be treated separately.

Run `node tester.js` to run the test. You can follow its progress in the Ganache console.
The results of this test will be written into a `testerOutputXX.tsv` file. (XX being the serial number automatically assigned to the test)

Run `node analyzer.js testerOutputXX.tsv` (XX corresponding with your test). This will create a `finalResultsXX.tsv` file. (XX being the serial number automatically assigned to the test)
Afterwards you can use Excel or any other program to analyze the results.

#### Notes

The serial numbers are only use to prevent overwriting of previous test results


