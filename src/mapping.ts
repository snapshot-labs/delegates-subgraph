import { dataSource } from '@graphprotocol/graph-ts'
import { DelegateChanged, DelegateVotesChanged, Transfer } from '../generated/Token/Token'
import {
  toDecimal,
  getOrCreateTokenHolder,
  getOrCreateDelegate,
  getGovernanceEntity,
  ZERO_ADDRESS,
  BIGINT_ZERO
} from './helpers'

export function handleDelegateChanged(event: DelegateChanged): void {
  let governanceId = dataSource.address()

  let tokenHolder = getOrCreateTokenHolder(event.params.delegator, governanceId)
  let previousDelegate = getOrCreateDelegate(event.params.fromDelegate, governanceId)
  let newDelegate = getOrCreateDelegate(event.params.toDelegate, governanceId)

  tokenHolder.delegate = newDelegate.id
  tokenHolder.save()

  previousDelegate.tokenHoldersRepresentedAmount -= 1
  previousDelegate.save()

  newDelegate.tokenHoldersRepresentedAmount += 1
  newDelegate.save()
}

export function handleDelegateVotesChanged(event: DelegateVotesChanged): void {
  let governanceId = dataSource.address()

  let governance = getGovernanceEntity(governanceId)
  let delegate = getOrCreateDelegate(event.params.delegate, governanceId)
  let votesDifference = event.params.newBalance.minus(event.params.previousBalance)

  delegate.delegatedVotesRaw = event.params.newBalance
  delegate.delegatedVotes = toDecimal(event.params.newBalance)
  delegate.save()

  if (event.params.previousBalance == BIGINT_ZERO && event.params.newBalance > BIGINT_ZERO) {
    governance.currentDelegates += 1
  }

  if (event.params.newBalance == BIGINT_ZERO) {
    governance.currentDelegates -= 1
  }

  governance.delegatedVotesRaw = governance.delegatedVotesRaw.plus(votesDifference)
  governance.delegatedVotes = toDecimal(governance.delegatedVotesRaw)
  governance.save()
}

export function handleTransfer(event: Transfer): void {
  let governanceId = dataSource.address()

  let fromHolder = getOrCreateTokenHolder(event.params.from, governanceId)
  let toHolder = getOrCreateTokenHolder(event.params.to, governanceId)
  let governance = getGovernanceEntity(governanceId)

  if (event.params.from.toHexString() != ZERO_ADDRESS) {
    let fromHolderPreviousBalance = fromHolder.tokenBalanceRaw
    fromHolder.tokenBalanceRaw = fromHolder.tokenBalanceRaw.minus(event.params.amount)
    fromHolder.tokenBalance = toDecimal(fromHolder.tokenBalanceRaw)

    if (fromHolder.tokenBalanceRaw == BIGINT_ZERO && fromHolderPreviousBalance > BIGINT_ZERO) {
      governance.currentTokenHolders -= 1
      governance.save()
    } else if (fromHolder.tokenBalanceRaw > BIGINT_ZERO && fromHolderPreviousBalance == BIGINT_ZERO) {
      governance.currentTokenHolders += 1
      governance.save()
    }

    fromHolder.save()
  }

  let toHolderPreviousBalance = toHolder.tokenBalanceRaw
  toHolder.tokenBalanceRaw = toHolder.tokenBalanceRaw.plus(event.params.amount)
  toHolder.tokenBalance = toDecimal(toHolder.tokenBalanceRaw)
  toHolder.totalTokensHeldRaw = toHolder.totalTokensHeldRaw.plus(event.params.amount)
  toHolder.totalTokensHeld = toDecimal(toHolder.totalTokensHeldRaw)

  if (toHolder.tokenBalanceRaw == BIGINT_ZERO && toHolderPreviousBalance > BIGINT_ZERO) {
    governance.currentTokenHolders -= 1
    governance.save()
  } else if (toHolder.tokenBalanceRaw > BIGINT_ZERO && toHolderPreviousBalance == BIGINT_ZERO) {
    governance.currentTokenHolders += 1
    governance.save()
  }

  toHolder.save()
}
