import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { TokenHolder, Delegate, Governance } from '../generated/schema';

export let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export let BIGINT_ZERO = BigInt.fromI32(0);

export let BIGDECIMAL_ZERO = new BigDecimal(BIGINT_ZERO);

export let DEFAULT_DECIMALS = 18

export function toDecimal(value: BigInt, decimals: number = DEFAULT_DECIMALS): BigDecimal {
  let precision = BigInt.fromI32(10)
    .pow(<u8>decimals)
    .toBigDecimal()

  return value.divDecimal(precision)
}

export function getOrCreateTokenHolder(id: Address, governanceId: Address): TokenHolder {
  let entityId = `${governanceId.toHexString()}/${id.toHexString()}`

  let tokenHolder = TokenHolder.load(entityId)

  if (tokenHolder == null) {
    tokenHolder = new TokenHolder(entityId)
    tokenHolder.governance = governanceId.toHexString()
    tokenHolder.user = id
    tokenHolder.tokenBalanceRaw = BIGINT_ZERO
    tokenHolder.tokenBalance = BIGDECIMAL_ZERO
    tokenHolder.totalTokensHeldRaw = BIGINT_ZERO
    tokenHolder.totalTokensHeld = BIGDECIMAL_ZERO

    if (id.toHexString() != ZERO_ADDRESS) {
      let governance = getGovernanceEntity(governanceId)
      governance.totalTokenHolders += 1
      governance.save()
    }

    tokenHolder.save()
  }

  return tokenHolder as TokenHolder
}

export function getOrCreateDelegate(id: Address, governanceId: Address): Delegate {
  let entityId = `${governanceId.toHexString()}/${id.toHexString()}`

  let delegate = Delegate.load(entityId)

  if (delegate == null) {
    delegate = new Delegate(entityId)
    delegate.governance = governanceId.toHexString()
    delegate.user = id
    delegate.delegatedVotesRaw = BIGINT_ZERO
    delegate.delegatedVotes = BIGDECIMAL_ZERO
    delegate.tokenHoldersRepresentedAmount = 0

    if (id.toHexString() != ZERO_ADDRESS) {
      let governance = getGovernanceEntity(governanceId)
      governance.totalDelegates += 1
      governance.save()
    }

    delegate.save()
  }

  return delegate as Delegate
}

export function getGovernanceEntity(governanceId: Address): Governance {
  let governance = Governance.load(governanceId.toHexString())

  if (governance == null) {
    governance = new Governance(governanceId.toHexString())
    governance.totalTokenHolders = 0
    governance.currentTokenHolders = 0
    governance.currentDelegates = 0
    governance.totalDelegates = 0
    governance.delegatedVotesRaw = BIGINT_ZERO
    governance.delegatedVotes = BIGDECIMAL_ZERO
  }

  return governance as Governance
}
