export const checkBalanceTool = (tools: PolkadotLangTools) => {
  return tool({
    name: "check_balance",
    description: "Check balance of the agent's account on a specific chain",
    schema: z.object({
      chain: z.string().describe("The chain name to check balance on (e.g., 'polkadot', 'kusama', 'westend', 'westend_asset_hub', etc.)"),
    }),
    func: async ({ chain }) => {
      try {
        const balance = await tools.checkBalance(chain);
        console.log(`Balance on ${chain}:`, balance);
        return {
          content: `Balance on ${chain}: ${balance.toFixed(4)}`,
          tool_call_id: `balance_${Date.now()}`,
        };
      } catch (error) {
        return {
          content: `Error checking balance on ${chain}: ${error.message}`,
          tool_call_id: `balance_error_${Date.now()}`,
        };
      }
    },
  });
};