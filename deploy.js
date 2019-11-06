const { Tezos } = require('@taquito/taquito')

const fs = require("fs");

const { email, password, mnemonic, secret } = JSON.parse(fs.readFileSync('./faucet.json').toString())

Tezos.setProvider({ rpc: "https://api.tez.ie/rpc/babylonnet" })

Tezos.importKey(email, password, mnemonic.join(" "), secret).then(async () => {
    return Tezos.contract.originate({
        code: JSON.parse(fs.readFileSync("./build/Audit.json").toString()),
        init: {
            prim: "Pair",
            args: [
                {
                    prim: "Pair",
                    args: [
                        [
                            {
                                prim: "Elt", args: [{ string: await Tezos.signer.publicKeyHash() },
                                {
                                    prim: 'Pair',
                                    args: [[], { int: '100' }],
                                }]
                            }
                        ],
                        {
                            "string": await Tezos.signer.publicKeyHash()
                        },
                    ]
                },
                {
                    "int": "100"
                }
            ]
        },
        // storage: {
        //     owner: await Tezos.signer.publicKeyHash(),
        //     totalSupply: "100",
        //     accounts: {}
        // },
        // fee: 10000,
        // gasLimit: 400000,
        // storageLimit: 2000
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
