import {
  REQUESTING_GITHUB_TOKEN,
  REQUESTED_GITHUB_TOKEN_SUCCESS,
  REQUESTED_GITHUB_TOKEN_FAILURE,
  REQUESTED_GITHUB_DISCONNECT,
  REPO_ADDED,
  REPO_REMOVED,
  BOUNTY_ADDED,
  ASSIGNMENT_REQUESTED,
  ASSIGNMENT_APPROVED,
  ASSIGNMENT_REJECTED,
  SUBMISSION_REJECTED,
  BOUNTY_FULFILLED,
  SUBMISSION_ACCEPTED,
  BOUNTY_SETTINGS_CHANGED,
  VAULT_DEPOSIT,
} from './eventTypes'

import { INITIAL_STATE } from './'

import {
  initializeGraphQLClient,
  syncRepos,
  loadReposFromQueue,
  loadIssueData,
  loadIpfsData,
  determineWorkStatus,
  updateIssueDetail,
  syncIssues,
  syncTokens,
  syncSettings
} from './helpers'

import { STATUS } from '../utils/github'

export const handleEvent = async (state, action, vaultAddress, vaultContract) => {
  const { event, returnValues, address } = action
  let nextState = { ...state }

  switch (event) {
  case REQUESTING_GITHUB_TOKEN: {
    return state
  }
  case REQUESTED_GITHUB_TOKEN_SUCCESS: {
    const { token } = returnValues
    if (token) {
      initializeGraphQLClient(token)
    }

    const loadedRepos = await loadReposFromQueue(state)

    const status = STATUS.AUTHENTICATED
    const github = {
      token,
      status,
      event: null
    }
    const repos = [ ...state.repos, ...loadedRepos ]

    return { ...nextState, github, repos }
  }
  case REQUESTED_GITHUB_TOKEN_FAILURE: {
    return state
  }
  case REQUESTED_GITHUB_DISCONNECT: {
    const { github } = INITIAL_STATE
    nextState = { ...state, github }
    return nextState
  }
  case REPO_ADDED: {
    nextState = await syncRepos(nextState, returnValues)
    return nextState
  }
  case REPO_REMOVED: {
    const id = returnValues.repoId
    const repoIndex = nextState.repos.findIndex(repo => repo.id === id)
    if (repoIndex === -1) return nextState
    nextState.repos.splice(repoIndex,1)
    return nextState
  }
  case BOUNTY_ADDED: {
    if(!returnValues) return nextState
    const { repoId, issueNumber, ipfsHash } = returnValues
    const ipfsData = await loadIpfsData(ipfsHash)
    let issueData = await loadIssueData({ repoId, issueNumber })
    issueData = { ...issueData, ...ipfsData }
    issueData = determineWorkStatus(issueData)
    nextState = syncIssues(nextState, returnValues, issueData, [])
    return nextState
  }
  case ASSIGNMENT_REQUESTED: {
    if(!returnValues) return nextState
    const { repoId, issueNumber } = returnValues
    let issueData = await loadIssueData({ repoId, issueNumber })
    issueData = await updateIssueDetail(issueData)
    issueData = determineWorkStatus(issueData)
    nextState = syncIssues(nextState, returnValues, issueData)
    return nextState
  }
  case ASSIGNMENT_APPROVED: {
    if(!returnValues) return nextState
    const { repoId, issueNumber } = returnValues
    let issueData = await loadIssueData({ repoId, issueNumber })
    issueData = await updateIssueDetail(issueData)
    issueData = determineWorkStatus(issueData)
    nextState = syncIssues(nextState, returnValues, issueData)
    return nextState
  }
  case ASSIGNMENT_REJECTED: {
    if(!returnValues) return nextState
    const { repoId, issueNumber } = returnValues
    let issueData = await loadIssueData({ repoId, issueNumber })
    issueData = await updateIssueDetail(issueData)
    issueData = determineWorkStatus(issueData)
    nextState = syncIssues(nextState, returnValues, issueData)
    return nextState
  }
  case SUBMISSION_REJECTED: {
    if(!returnValues) return nextState
    const { repoId, issueNumber } = returnValues
    let issueData = await loadIssueData({ repoId, issueNumber })
    issueData = await updateIssueDetail(issueData)
    issueData = determineWorkStatus(issueData)
    nextState = syncIssues(nextState, returnValues, issueData)
    return nextState
  }
  // case BOUNTY_FULFILLED: {
  //   if(!returnValues) return nextState
  //   const { _bountyId, _data } = returnValues
  //   const issue = nextState.issues.find(i => i.data.standardBountyId)
  //   console.log('BOUNTY_FULFILLED', { returnValues, nextState, issue })
  //   if (!issue) return nextState
  //   const repoId = toHex(issue.data.repoId)
  //   const issueNumber = String(issue.data.number)
  //   let issueData = await loadIssueData({ repoId, issueNumber }) // TODO: is this the same as issue.data? Do we need to do this?
  //   issueData = await updateIssueDetail(issueData, _data)
  //   issueData = determineWorkStatus(issueData)
  //   nextState = syncIssues(nextState, { issueNumber }, issueData)
  //   console.log({ _bountyId, nextState })
  //   return nextState
  // }
  case SUBMISSION_ACCEPTED: {
    if (!returnValues) return nextState
    const { repoId, issueNumber } = returnValues
    let issueData = await loadIssueData({ repoId, issueNumber })
    issueData = await updateIssueDetail(issueData)
    issueData = determineWorkStatus(issueData)
    nextState = syncIssues(nextState, returnValues, issueData)
    return nextState
  }
  case BOUNTY_SETTINGS_CHANGED:
    nextState = await syncSettings(nextState) // No returnValues on this
    nextState = await syncTokens(nextState, { token: nextState.bountySettings.bountyCurrency }, vaultContract )
    return nextState
  case VAULT_DEPOSIT:
    if (vaultAddress !== address) return nextState
    nextState = await syncTokens(nextState, returnValues, vaultContract)
    return nextState
  default:
    return nextState
  }
}
