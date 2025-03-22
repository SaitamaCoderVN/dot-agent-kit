import { PolkadotAgentKit } from '../agent/index';
import { chainPalletNames, defaultPalletNames } from '../config/palletNames';

export class PolkadotTools {
  private agent: PolkadotAgentKit;

  constructor(agent: PolkadotAgentKit) {
    this.agent = agent;
  }

  /**
   * Check the WND balance of the agent's account on a specific chain
   * @param chainName Name of the chain (e.g., 'westend')
   * @returns Balance in WND
   */
  async checkBalance(chainName: string): Promise<number> {
    const { api } = this.agent.getConnection(chainName);
    const accountInfo = await api.query.System.Account.getValue(this.agent.address);

    const planckBalance = BigInt(accountInfo.data.free.toString());
    const wndBalance = Number(planckBalance) / Math.pow(10, 12); 

    return wndBalance;
  }

  async checkProxies(chainName: string): Promise<any[]> {
    try {
        const { api } = this.agent.getConnection(chainName);
        
        const configuredName = chainPalletNames[chainName]?.proxy;
        const proxyPallet = configuredName && api.query[configuredName]?.Proxies
            ? configuredName
            : defaultPalletNames.find(name => api.query[name]?.Proxies);
        
        if (!proxyPallet) {
            return [{ error: `No proxy pallet found on chain ${chainName}` }];
        }
        
        const proxiesInfo = await api.query[proxyPallet].Proxies.getValue(this.agent.address);
        const [proxies] = proxiesInfo;

        if (!proxies || proxies.length === 0) {
            return [];
        }
        return proxies;
    } catch (error) {
        console.error(`Error checking proxies on ${chainName}:`, error);
        return [{ error: `Failed to check proxies: ${error instanceof Error ? error.message : String(error)}` }];
    }
  }
}