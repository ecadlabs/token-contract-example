const { TezosToolkit } = require('@taquito/taquito')
const fs = require("fs");
const assert = require('assert')
const { address, network } = JSON.parse(fs.readFileSync("./deployed/latest.json").toString())
const BigNumber = require('bignumber.js');

const transferType = {
    "prim": "pair",
    "args":
        [{
            "prim": "pair",
            "args":
                [{ "prim": "address" }, { "prim": "address" }]
        },
        { "prim": "nat" }]
}

const transferValue = (from, to, amount) => (
    {
        "prim": "Pair",
        "args":
            [{
                "prim": "Pair",
                "args":
                    [{ "string": from }, { "string": to }]
            },
            { "int": amount }]
    }
)

const transferToken = (from, to, amount, contract) => {
    return [
        { prim: 'DROP' },
        { prim: 'NIL', args: [{ prim: 'operation' }] },
        {
            prim: 'PUSH',
            args: [{ prim: 'address' }, { string: `${contract}%transfer` }],
        },
        { prim: 'CONTRACT', args: [transferType] },
        [
            {
                prim: 'IF_NONE',
                args: [[[{ prim: 'UNIT' }, { prim: 'FAILWITH' }]], []],
            },
        ],
        {
            prim: 'PUSH',
            args: [{ prim: 'mutez' }, { int: `0` }],
        },
        {
            prim: 'PUSH',
            args: [transferType, transferValue(from, to, amount)]
        },
        { prim: 'TRANSFER_TOKENS' },
        { prim: 'CONS' },
    ];
};

const createTezosFromFaucet = async (path) => {
    const { email, password, mnemonic, secret } = JSON.parse(fs.readFileSync(path).toString())
    const Tezos = new TezosToolkit();
    Tezos.setProvider({ rpc: network, confirmationPollingTimeoutSecond: 300 })
    await Tezos.importKey(email, password, mnemonic.join(" "), secret)
    return Tezos;
}

const getAccounts = async () => {
    const Tezos1 = await createTezosFromFaucet('./faucet.json');
    const Tezos2 = await createTezosFromFaucet('./faucet2.json');
    const manager = await Tezos1.contract.at('KT1PhLwXfhn1UQnuU1ceJ8SvtNeMdcg6ygwY')
    return { Tezos1, Tezos2, manager }
}

const getFullStorage = async (address, keys) => {
    const { Tezos1 } = await getAccounts()
    const contract = await Tezos1.contract.at(address);
    const storage = await contract.storage();
    const accounts = await keys.reduce(async (prev, current) => {
        const value = await prev;

        let entry = {
            balance: new BigNumber(0),
            allowances: {},
        }

        try {
            entry = await storage.ledger.get(current)
        } catch (ex) {
            console.error(ex)
            // Do nothing
        }

        return {
            ...value,
            [current]: entry
        }
    }, Promise.resolve({}))
    return {
        ...storage,
        accounts
    }
}

const testTransferToManager = async (address, amount = "2") => {
    const { Tezos1, manager } = await getAccounts()

    const pkh = await Tezos1.signer.publicKeyHash();
    const initialStorage = await getFullStorage(address, [pkh, manager.address])

    const contract3 = await Tezos1.contract.at(address)
    const operation = await contract3.methods.transfer(pkh, manager.address, amount).send()
    await operation.confirmation();

    assert(operation.status === 'applied', 'Operation was not applied')

    const finalStorage = await getFullStorage(address, [pkh, manager.address])

    assert(initialStorage.accounts[pkh].balance.toString() === finalStorage.accounts[pkh].balance.plus(amount).toString())
    assert(initialStorage.accounts[manager.address].balance.toString() === finalStorage.accounts[manager.address].balance.minus(amount).toString())
}

const testTransferToImplicit = async (address, amount = "2") => {
    const { Tezos1, Tezos2 } = await getAccounts()

    const pkh = await Tezos1.signer.publicKeyHash();
    const pkh2 = await Tezos2.signer.publicKeyHash();
    const initialStorage = await getFullStorage(address, [pkh, pkh2])

    const contract3 = await Tezos1.contract.at(address)
    const operation = await contract3.methods.transfer(pkh, pkh2, amount).send()
    await operation.confirmation();

    assert(operation.status === 'applied', 'Operation was not applied')

    const finalStorage = await getFullStorage(address, [pkh, pkh2])

    assert(initialStorage.accounts[pkh].balance.toString() === finalStorage.accounts[pkh].balance.plus(amount).toString())
    assert(initialStorage.accounts[pkh2].balance.toString() === finalStorage.accounts[pkh2].balance.minus(amount).toString())
}

const testTransferInsufficientAmount = async (address) => {
    const { Tezos1, Tezos2 } = await getAccounts()

    const pkh = await Tezos1.signer.publicKeyHash();
    const pkh2 = await Tezos2.signer.publicKeyHash();

    const contract3 = await Tezos2.contract.at(address)
    const operation = await contract3.methods.transfer(pkh2, pkh, "102").send()
    await operation.confirmation();

    assert(operation.status !== 'applied', 'Operation was not applied')
}

const testTransferUnapprovedAmount = async (address) => {
    const { Tezos1, Tezos2 } = await getAccounts()

    const pkh = await Tezos1.signer.publicKeyHash();
    const pkh2 = await Tezos2.signer.publicKeyHash();

    const contract3 = await Tezos2.contract.at(address)
    const operation = await contract3.methods.transfer(pkh, pkh2, "1").send()
    await operation.confirmation();

    assert(operation.status !== 'applied', 'Operation was not applied')
}

const testAllowanceToManager = async (address, amount) => {
    const { Tezos1, manager } = await getAccounts()

    const pkh = await Tezos1.signer.publicKeyHash();

    const contract3 = await Tezos1.contract.at(address)
    const operation = await contract3.methods.approve(manager.address, amount).send()
    await operation.confirmation();

    assert(operation.status === 'applied', 'Operation was not applied')

    const finalStorage = await getFullStorage(address, [pkh, manager.address])

    assert(finalStorage.accounts[pkh].allowances[manager.address].toString() === amount)
}

const testAllowanceToImplicit = async (address, amount) => {
    const { Tezos1, Tezos2 } = await getAccounts()

    const pkh = await Tezos1.signer.publicKeyHash();
    const pkh2 = await Tezos2.signer.publicKeyHash();

    const contract3 = await Tezos1.contract.at(address)
    const operation = await contract3.methods.approve(pkh2, amount).send()
    await operation.confirmation();

    assert(operation.status === 'applied', 'Operation was not applied')

    const finalStorage = await getFullStorage(address, [pkh, pkh2])

    assert(finalStorage.accounts[pkh].allowances[pkh2].toString() === amount)
}

const testAllowanceFromImplicit = async (address) => {
    const { Tezos1, Tezos2 } = await getAccounts()
    const pkh = await Tezos1.signer.publicKeyHash();
    const pkh2 = await Tezos2.signer.publicKeyHash();

    const initialStorage = await getFullStorage(address, [pkh, pkh2])

    const contract3 = await Tezos2.contract.at(address)
    const operation = await contract3.methods.transfer(pkh, pkh2, "1").send()
    await operation.confirmation();

    assert(operation.status === 'applied', 'Operation was not applied')

    const finalStorage = await getFullStorage(address, [pkh, pkh2])

    assert(initialStorage.accounts[pkh].balance.toString() === finalStorage.accounts[pkh].balance.plus(1).toString())
    assert(initialStorage.accounts[pkh2].balance.toString() === finalStorage.accounts[pkh2].balance.minus(1).toString())
    assert(initialStorage.accounts[pkh].allowances[pkh2].toString() === finalStorage.accounts[pkh].allowances[pkh2].plus(1).toString())
}

const testAllowanceFromManager = async (address) => {
    const { Tezos1, manager } = await getAccounts()
    const pkh = await Tezos1.signer.publicKeyHash();

    const initialStorage = await getFullStorage(address, [pkh, manager.address])

    const operation = await manager.methods.do(transferToken(pkh, manager.address, "1", address)).send()
    await operation.confirmation();

    assert(operation.status === 'applied', 'Operation was not applied')

    const finalStorage = await getFullStorage(address, [pkh, manager.address])

    assert(initialStorage.accounts[pkh].balance.toString() === finalStorage.accounts[pkh].balance.plus(1).toString())
    assert(initialStorage.accounts[manager.address].balance.toString() === finalStorage.accounts[manager.address].balance.minus(1).toString())
    assert(initialStorage.accounts[pkh].allowances[manager.address].toString() === finalStorage.accounts[pkh].allowances[manager.address].plus(1).toString())
}

const testMintFromOwner = async (address) => {
    const { Tezos1 } = await getAccounts()
    const pkh = await Tezos1.signer.publicKeyHash();
    const initialStorage = await getFullStorage(address, [pkh])
    const contract3 = await Tezos1.contract.at(address)
    const operation = await contract3.methods.mint("1").send()

    await operation.confirmation();

    const finalStorage = await getFullStorage(address, [pkh])
    assert(initialStorage.accounts[pkh].balance.toString() === finalStorage.accounts[pkh].balance.minus(1).toString())
    assert(initialStorage.totalSupply.toString() === finalStorage.totalSupply.minus(1).toString())
}

const testBurnFromOwner = async (address, amount = "1") => {
    const { Tezos1 } = await getAccounts()
    const pkh = await Tezos1.signer.publicKeyHash();
    const initialStorage = await getFullStorage(address, [pkh])
    const contract3 = await Tezos1.contract.at(address)
    const operation = await contract3.methods.burn(amount).send()

    await operation.confirmation();

    const finalStorage = await getFullStorage(address, [pkh])
    assert(initialStorage.accounts[pkh].balance.toString() === finalStorage.accounts[pkh].balance.plus(amount).toString())
    assert(initialStorage.totalSupply.toString() === finalStorage.totalSupply.plus(amount).toString())
}

const testMintFromNotOwner = async (address) => {
    const { Tezos2 } = await getAccounts()
    const pkh = await Tezos2.signer.publicKeyHash();
    const initialStorage = await getFullStorage(address, [pkh])
    const contract3 = await Tezos2.contract.at(address)
    const operation = await contract3.methods.mint("1").send()

    await operation.confirmation();

    const finalStorage = await getFullStorage(address, [pkh])
    assert(initialStorage.accounts[pkh].balance.toString() === finalStorage.accounts[pkh].balance.minus(1).toString())
    assert(initialStorage.totalSupply.toString() === finalStorage.totalSupply.minus(1).toString())
}

const expectThrow = async (fn) => {
    let throwed = false;
    try {
        await fn()
    } catch (ex) {
        throwed = true;
    }

    if (!throwed) {
        throw new Error('Exepected step to throw error')
    }
}

const assertInvariant = async (testFn) => {
    const { Tezos1, Tezos2, manager } = await getAccounts()
    const pkh = await Tezos1.signer.publicKeyHash();
    const pkh2 = await Tezos2.signer.publicKeyHash();
    await testFn();
    const finalStorage = await getFullStorage(address, [pkh, pkh2, manager.address])

    const totalSupply = Object.keys(finalStorage.accounts).reduce((prev, current) => prev + finalStorage.accounts[current].balance.toNumber(), 0)
    assert(totalSupply === finalStorage.totalSupply.toNumber(), `Expected ${totalSupply} to be ${finalStorage.totalSupply.toNumber()}`)
}

const test = async () => {
    const tests = [
        () => testTransferToManager(address),
        () => testAllowanceToManager(address, "2"),
        () => testAllowanceToManager(address, "5"),
        () => testAllowanceFromManager(address),
        () => testAllowanceToManager(address, "0"),
        () => expectThrow(() => testAllowanceFromManager(address)),
        () => expectThrow(() => testTransferInsufficientAmount(address)),
        () => expectThrow(() => testTransferUnapprovedAmount(address)),
        () => testTransferToImplicit(address),
        () => testAllowanceToImplicit(address, "5"),
        () => testAllowanceFromImplicit(address),
        () => expectThrow(() => testAllowanceToImplicit(address, "-5")),
        () => expectThrow(() => testTransferToImplicit(address, "-5")),
        () => expectThrow(() => testTransferToManager(address, "-2")),
        () => testMintFromOwner(address),
        () => expectThrow(() => testMintFromNotOwner(address)),
        () => expectThrow(() => testBurnFromOwner(address, "200")),
        () => testBurnFromOwner(address, 1)
    ];

    for (let test of tests) {
        await assertInvariant(test)
    }
}

try {
    test().catch(console.log);
} catch (ex) { console.log(ex) }
