/** Central path builders — avoid hard-coded `/dashboard/...` fragments in pages. */

const DASHBOARD = '/dashboard';

export const dashboardPaths = {
  agentsRoot: () => `${DASHBOARD}/agents`,
  agentDetail: (agentId: number) => `${DASHBOARD}/agents/${agentId}`,
  playersRoot: () => `${DASHBOARD}/players`,
  playersWithAgentUsernameQuery: (agentUsername: string) =>
    `${DASHBOARD}/players?agent=${encodeURIComponent(agentUsername)}`,
  transactionsWithAgentUsernameQuery: (agentUsername: string) =>
    `${DASHBOARD}/transactions?agent=${encodeURIComponent(agentUsername)}`,
};
