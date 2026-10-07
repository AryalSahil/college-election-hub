export const PAGE_LABELS = {
  voting: "Voting",
  results: "Results",
  notifications: "Notifications",
  none: "No Page",
  maintenance: "Maintenance",
} as const;

export type PageKey = keyof typeof PAGE_LABELS;

export const VOTING_STATUS_LABELS = {
  not_started: "Not Started",
  open: "Open",
  paused: "Paused",
  closed: "Closed",
} as const;

export type VotingStatusKey = keyof typeof VOTING_STATUS_LABELS;

export const ELECTION_STATUS_LABELS = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
} as const;

export type ElectionStatusKey = keyof typeof ELECTION_STATUS_LABELS;
