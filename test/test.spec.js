const { Tezos } = require('@taquito/taquito')

const fs = require("fs");
const { email, password, mnemonic, secret } = JSON.parse(fs.readFileSync('./faucet.json').toString())
const { address, network } = JSON.parse(fs.readFileSync("./deployed/latest.json").toString())
Tezos.setProvider({ rpc: network })
Tezos.importKey(email, password, mnemonic.join(" "), secret)
    .then(async () => {
        const contract = await Tezos.contract.at(address)
        const op = await contract.methods.transfer(await Tezos.signer.publicKeyHash(), "tz1eY5Aqa1kXDFoiebL28emyXFoneAoVg1zh", "2").send()
        await op.confirmation()
        console.log((await (await contract.storage()).accounts.get(await Tezos.signer.publicKeyHash())).balance)
        // // console.log((await (await contract.storage()).accounts.get("tz1Kz6VSEPNnKPiNvhyio6E1otbSdDhVD9qB")).balance)
        console.log((await (await contract.storage()).accounts.get("tz1eY5Aqa1kXDFoiebL28emyXFoneAoVg1zh")).balance)

        const op2 = await contract.methods.approve("tz1eY5Aqa1kXDFoiebL28emyXFoneAoVg1zh", "2").send()
        await op2.confirmation()
        console.log((await (await contract.storage()).accounts.get(await Tezos.signer.publicKeyHash())).allowances['tz1eY5Aqa1kXDFoiebL28emyXFoneAoVg1zh'])
        // console.log((await (await contract.storage()).accounts.get(await Tezos.signer.publicKeyHash())).allowances['tz1Kz6VSEPNnKPiNvhyio6E1otbSdDhVD9qB'])
        // const sumContract = await Tezos.contract.at("KT1FRXx3enZa8qqsJswcqngHnyNr4t2P9Zjo")
        const op3 = await contract.methods.getAllowance(await Tezos.signer.publicKeyHash(), 'tz1eY5Aqa1kXDFoiebL28emyXFoneAoVg1zh', 'KT1KGJ6CmtXxKGXTLxGEybgRBn7d3myMPie8').send({ fee: 800000, storageLimit: 2000, gasLimit: 800000 })
        await op3.confirmation()
    })
