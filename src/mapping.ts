import { Address, dataSource } from '@graphprotocol/graph-ts';
import { DelegateChanged, DelegateVotesChanged } from '../generated/templates/GenericERC20Votes/Token';
import { toDecimal, getDelegate, getGovernance, BIGINT_ZERO } from './helpers';
import { ContractDeployed } from "../generated/GeneralPurposeFactory/GeneralPurposeFactory";
import { GenericERC20Votes } from "../generated/templates";
import { log } from '@graphprotocol/graph-ts';

const GENERIC_ERC20_VOTES_IMPLEM = Address.fromString('0x75DB1EEE7b03A0C9BcAD50Cb381B068c209c81ef'); // Address should be the same on all networks

export function handleDelegateChanged(event: DelegateChanged): void {
  log.warning("DelegateChanged event: {}", [event.address.toHex()]);
  let governanceId = dataSource.address();

  let previousDelegate = getDelegate(event.params.fromDelegate, governanceId);
  previousDelegate.tokenHoldersRepresentedAmount -= 1;
  previousDelegate.save();

  let newDelegate = getDelegate(event.params.toDelegate, governanceId);
  newDelegate.tokenHoldersRepresentedAmount += 1;
  newDelegate.save();
}

export function handleDelegateVotesChanged(event: DelegateVotesChanged): void {
  log.warning("DelegateChanged event: {}", [event.address.toHex()]);

  let governanceId = dataSource.address();

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

export function handleContractDeployed(event: ContractDeployed): void {
  log.warning("Handle contract deployed: {}", [event.address.toHex()]);

  if (event.params.implementation.equals(GENERIC_ERC20_VOTES_IMPLEM)) {
    GenericERC20Votes.create(event.params.contractAddress);
  }
}