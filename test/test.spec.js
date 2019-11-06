const { Tezos } = require('@taquito/taquito')

const fs = require("fs");
const { email, password, mnemonic, secret } = JSON.parse(fs.readFileSync('./faucet.json').toString())
const { address, network } = JSON.parse(fs.readFileSync("./deployed/latest.json").toString())
Tezos.setProvider({ rpc: network })
Tezos.importKey(email, password, mnemonic.join(" "), secret)
    .then(async () => {
        const contract = await Tezos.contract.at(address)
        const op = await contract.methods.main(await Tezos.signer.publicKeyHash(), "tz1eY5Aqa1kXDFoiebL28emyXFoneAoVg1zh", "200").send()
        await op.confirmation()
        console.log((await (await contract.storage()).accounts.get(await Tezos.signer.publicKeyHash())).balance)
        console.log((await (await contract.storage()).accounts.get("tz1Kz6VSEPNnKPiNvhyio6E1otbSdDhVD9qB")).balance)
        console.log((await (await contract.storage()).accounts.get("tz1eY5Aqa1kXDFoiebL28emyXFoneAoVg1zh")).balance)
    })
