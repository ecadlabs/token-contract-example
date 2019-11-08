const { exec } = require("child_process");
const fs = require("fs");

exec(`docker run -v $PWD:$PWD --rm -i ligolang/ligo:next compile-contract --michelson-format=json $PWD/contracts/Token.ligo main`, (err, stdout, stderr) => {
    if (err)
        throw err

    fs.writeFileSync('./build/Token.json', stdout)
})
