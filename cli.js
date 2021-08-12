const fs = require('fs');
const program = require('commander');
const { TezosToolkit, MichelsonMap } = require('@taquito/taquito');
const { importKey } = require('@taquito/signer');
const { encodeExpr } = require('@taquito/utils');
const { HttpBackend } = require('@taquito/http-utils');
program.version('0.0.1');

const setup = async () => {
  const { email, password, mnemonic, secret } = JSON.parse(
    fs.readFileSync('./faucet.json').toString()
  );

  var Tezos = new TezosToolkit('https://florencenet.smartpy.io');

  //   await importKey(Tezos, email, password, mnemonic.join(' '), secret);
  await importKey(Tezos, email, password, mnemonic.join(' '), secret).catch((e) =>
    console.error('\nerror :' + e)
  );
  return Tezos;
};

program.command('deploy <total_supply>').action(async (total_supply, command) => {
  console.log('Deploying...');
  try {
    const Tezos = await setup();
    const userAddress = await Tezos.signer.publicKeyHash();
    const allowances = MichelsonMap.fromLiteral({ [userAddress]: total_supply });

    const ledger = MichelsonMap.fromLiteral({
      [userAddress]: {
        balance: total_supply,
        allowances: allowances,
      },
    });

    const extras = MichelsonMap.fromLiteral({});
    const op = await Tezos.contract.originate({
      code: JSON.parse(fs.readFileSync('./build/Token.json').toString()),
      storage: {
        name: 'MyToken',
        symbol: 'MT',
        decimals: 6,
        extras,
        owner: userAddress,
        totalSupply: total_supply,
        ledger: ledger,
      },
    });

    const contract = await op.contract();
    console.log('Deployed at address: ', contract.address);
  } catch (ex) {
    console.error('ex');
    console.error(ex);
  }
});

const prettyPrint = (obj) => JSON.stringify(obj, null, 2);

program.command('storage <address>').action(async (address, command) => {
  try {
    const Tezos = await setup();
    const contract = await Tezos.contract.at(address);
    const storage = prettyPrint(await contract.storage());
    const rawStorage = prettyPrint(await Tezos.rpc.getStorage(address));
    console.log(`Storage:\n${storage}`);
    console.log(`Raw Storage:\n${rawStorage}`);
  } catch (ex) {
    console.error(ex);
  }
});

program.command('account').action(async () => {
  try {
    const Tezos = await setup();
    console.log(await Tezos.signer.publicKeyHash());
  } catch (ex) {
    console.error(ex);
  }
});

program.command('bigMap <address> <key>').action(async (address, keyToEncode, command) => {
  try {
    const Tezos = await setup();
    const contract = await Tezos.contract.at(address);
    const storage = await contract.storage();

    const bigMapID = storage.ledger.id.toString();

    const { key, type } = storage.ledger.schema.EncodeBigMapKey(keyToEncode);
    const { packed } = await Tezos.rpc.packData({ data: key, type });

    const encodedExpr = encodeExpr(packed);

    const bigMapValue = prettyPrint(await storage.ledger.get(keyToEncode));
    const rawBigMapValue = prettyPrint(await Tezos.rpc.getBigMapExpr(bigMapID, encodedExpr));
    console.log(`Storage:\n${bigMapValue}`);
    console.log(`Raw Storage:\n${rawBigMapValue}`);
  } catch (ex) {
    console.error(ex);
  }
});

program.parse(process.argv);
