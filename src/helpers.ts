import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts';
import { Delegate, Governance } from '../generated/schema';

export let BIGINT_ZERO = BigInt.fromI32(0);

export let BIGDECIMAL_ZERO = new BigDecimal(BIGINT_ZERO);

export let DEFAULT_DECIMALS = 18;

export let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function toDecimal(value: BigInt, decimals: number = DEFAULT_DECIMALS): BigDecimal {
  let precision = BigInt.fromI32(10)
    .pow(<u8>decimals)
    .toBigDecimal();

  return value.divDecimal(precision);
}

export function getDelegate(id: Address, governanceId: Address): Delegate {
  let entityId = `${governanceId.toHexString()}/${id.toHexString()}`;

  let delegate = Delegate.load(entityId);

  if (delegate == null) {
    delegate = new Delegate(entityId);
    delegate.governance = governanceId.toHexString();
    delegate.user = id;
    delegate.delegatedVotesRaw = BIGINT_ZERO;
    delegate.delegatedVotes = BIGDECIMAL_ZERO;
    delegate.tokenHoldersRepresentedAmount = 0;

    if (id.toHexString() != ZERO_ADDRESS) {
      let governance = getGovernance(governanceId);
      governance.totalDelegates += 1;
      governance.save();
    }
  }

  return delegate;
}

export function getGovernance(governanceId: Address): Governance {
  let governance = Governance.load(governanceId.toHexString());

  if (governance == null) {
    governance = new Governance(governanceId.toHexString());
    governance.currentDelegates = 0;
    governance.delegatedVotesRaw = BIGINT_ZERO;
    governance.delegatedVotes = BIGDECIMAL_ZERO;
  }

  return governance
}
