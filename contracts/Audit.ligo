
type account is record
    balance : int;
    allowances: map(address, int);
end

type action is
| Transfer of (address * address * int)
// | approve of (address * nat)
// | getAllowance (address * address * nat)
// | getBalance (address * nat)
// | getTotalSupply (unit * nat)

type contract_storage is record
  owner: address;
  totalSupply: int;
  accounts: big_map(address, account);
end

function transfer (const source : address ; const destination : address ; const value : int ; var s : contract_storage) : contract_storage is
 begin
  const src: account = get_force(source, s.accounts);
  var dst: account := record 
      balance = 0;
      allowances = (map end : map(address, int));
  end;
  case s.accounts[destination] of
  | None -> skip
  | Some(n) -> dst := n
  end;

  if value > src.balance 
  then failwith ("Balance is too low");
  else skip;

  const srcBalance: int = src.balance - value;
  if srcBalance < 0 then failwith ("Balance cannot be negative");
  else src.balance := srcBalance;

  dst.balance := dst.balance + value;

  s.accounts[source] := src;
  s.accounts[destination] := dst;

 end with s

function main (const p : action ; const s : contract_storage) :
  (list(operation) * contract_storage) is
 block { skip } with ((nil : list(operation)),
  case p of
  | Transfer(n) -> transfer(n.0, n.1, n.2, s)
 end)