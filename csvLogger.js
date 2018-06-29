/*
USAGE:

const logger = require('./logger')('outputFile', 'separator', ['time', 'block', 'txHash']);

logger([time, block, txHash]);

 */

const fs = require('fs');

function getFirstAvailableName(start, end) {
    let testCode = 0;
    while (true){
        try {
            fs.accessSync(`${start}${testCode}${end}`);
        }
        catch (e){
            //accessSync throws if it cannot find the file. This means that the testCode we're using is OK
            break;
        }
        //file with that testCode already exists.
        testCode++;
    }
    return `${start}${testCode}${end}`;
}

function getLineStr(arr, separator) {
    //it's just a string. not an array
    if(!arr.length){
        return arr + '\n';
    }

    let output = '';
    for(let i = 0, len = arr.length; i < len; i++){
        output+=arr[i] + separator;
    }
    //replace the last comma with a newline
    return output.slice(0, -1) + '\n';
}

module.exports = function (desiredFileName,separator, header) {

    const fileName = getFirstAvailableName(desiredFileName, '.tsv');

    const logStream = fs.createWriteStream(`${__dirname}/${fileName}`, { flags: 'a' });

    if(header) {
        logStream.write(getLineStr(header, separator));
    }

    return function (elements) {
        logStream.write(getLineStr(elements, separator));
    }
};
