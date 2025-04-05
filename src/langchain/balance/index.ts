import { DynamicTool } from '@langchain/core/tools';
import { z } from 'zod';
import { PolkadotLangTools } from '../../tools/index';

interface BalanceParams {
  chain: string;
}

export const checkBalanceTool = (tools: PolkadotLangTools) => {
  return new DynamicTool({
    name: "check_balance",
    description: "Check balance of the agent's account on a specific chain",
    func: async (input: string) => {
      try {
        const params = JSON.parse(input) as BalanceParams;
        const { chain } = params;
        
        const balance = await tools.checkBalance(chain);
        return `Balance on ${chain}: ${balance.toFixed(4)}`;
      } catch (error) {
        if (error instanceof Error) {
          return `Error checking balance: ${error.message}`;
        }
        return `Error checking balance: ${String(error)}`;
      }
    }
  });
};