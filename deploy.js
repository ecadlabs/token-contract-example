const { Tezos } = require('@taquito/taquito')

const fs = require("fs");

const { email, password, mnemonic, secret } = JSON.parse(fs.readFileSync('./faucet.json').toString())

Tezos.setProvider({ rpc: "https://api.tez.ie/rpc/babylonnet" })

Tezos.importKey(email, password, mnemonic.join(" "), secret).then(async () => {
    return Tezos.contract.originate({
        code: JSON.parse(fs.readFileSync("./build/Token.json").toString()),
        storage: {
            owner: await Tezos.signer.publicKeyHash(),
            totalSupply: "100",
            ledger: {
                [await Tezos.signer.publicKeyHash()]: {
                    balance: "100",
                    allowances: {}
                },
            },
        },
    })
}).then((op) => {
    return op.contract()
}).then((contract) => {
    const detail = {
        address: contract.address,
        network: "https://api.tez.ie/rpc/babylonnet"
    }

    fs.writeFileSync('./deployed/latest.json', JSON.stringify(detail))
    fs.writeFileSync(`./deployed/${contract.address}.json`, JSON.stringify(detail))
    console.log('Deployed at:', contract.address)
})
