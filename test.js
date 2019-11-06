const { Tezos } = require('@taquito/taquito')

const fs = require("fs");
const { email, password, mnemonic, secret } = JSON.parse(fs.readFileSync('./faucet.json').toString())
const { address, network } = JSON.parse(fs.readFileSync("./deployed/latest.json").toString())
Tezos.setProvider({ rpc: network })
Tezos.importKey(email, password, mnemonic.join(" "), secret)
    .then(async () => {
        const contract = await Tezos.contract.at(address)
        const op = await contract.methods.addLog("1", "test").send()
        await op.confirmation()
        const storage = await contract.storage()
        assert(storage.hash, "test")
    })
