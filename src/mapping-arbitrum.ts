import { Address, BigDecimal, BigInt, Bytes, dataSource } from '@graphprotocol/graph-ts';
import { Delegate, Governance } from '../generated/schema';
import { DelegateChanged, DelegateVotesChanged } from '../generated/ARB/Token';

let BIGINT_ZERO = BigInt.fromI32(0);
let BIGDECIMAL_ZERO = new BigDecimal(BIGINT_ZERO);
let DEFAULT_DECIMALS = 18;
let ZERO_ADDRESS_BYTES = Bytes.fromHexString('0x0000000000000000000000000000000000000000') as Bytes;

function toDecimal(value: BigInt, decimals: number = DEFAULT_DECIMALS): BigDecimal {
  let precision = BigInt.fromI32(10).pow(<u8>decimals).toBigDecimal();
  return value.divDecimal(precision);
}

function getGovernance(governanceId: Bytes): Governance {
  let governance = Governance.load(governanceId);
  if (governance == null) {
    governance = new Governance(governanceId);
    governance.currentDelegates = 0;
    governance.totalDelegates = 0;
    governance.delegatedVotesRaw = BIGINT_ZERO;
    governance.delegatedVotes = BIGDECIMAL_ZERO;
  }
  return governance;
}

function getDelegate(user: Address, governanceId: Bytes): Delegate {
  let userBytes = user as Bytes;
  let entityId = governanceId.concat(userBytes);

  let delegate = Delegate.load(entityId);
  if (delegate == null) {
    delegate = new Delegate(entityId);
    delegate.governance = governanceId;
    delegate.user = userBytes;
    delegate.delegatedVotesRaw = BIGINT_ZERO;
    delegate.delegatedVotes = BIGDECIMAL_ZERO;
    delegate.tokenHoldersRepresentedAmount = 0;

    if (!userBytes.equals(ZERO_ADDRESS_BYTES)) {
      let governance = getGovernance(governanceId);
      governance.totalDelegates += 1;
      governance.save();
    }
  }
  return delegate;
}

export function handleDelegateChanged(event: DelegateChanged): void {
  let governanceId = dataSource.address() as Bytes;

  let previousDelegate = getDelegate(event.params.fromDelegate, governanceId);
  previousDelegate.tokenHoldersRepresentedAmount -= 1;
  previousDelegate.save();

  let newDelegate = getDelegate(event.params.toDelegate, governanceId);
  newDelegate.tokenHoldersRepresentedAmount += 1;
  newDelegate.save();
}

export function handleDelegateVotesChanged(event: DelegateVotesChanged): void {
  let governanceId = dataSource.address() as Bytes;

  let governance = getGovernance(governanceId);
  let delegate = getDelegate(event.params.delegate, governanceId);
  let votesDifference = event.params.newBalance.minus(event.params.previousBalance);

  delegate.delegatedVotesRaw = event.params.newBalance;
  delegate.delegatedVotes = toDecimal(event.params.newBalance);
  delegate.save();

  if (event.params.previousBalance == BIGINT_ZERO && event.params.newBalance > BIGINT_ZERO) {
    governance.currentDelegates += 1;
  }

  if (event.params.newBalance == BIGINT_ZERO) {
    governance.currentDelegates -= 1;
  }

  governance.delegatedVotesRaw = governance.delegatedVotesRaw.plus(votesDifference);
  governance.delegatedVotes = toDecimal(governance.delegatedVotesRaw);
  governance.save();
}
