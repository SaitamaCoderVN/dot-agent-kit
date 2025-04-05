import { DynamicTool } from '@langchain/core/tools';
import { z } from 'zod';
import { PolkadotLangTools } from '../../tools/index';
import { ChainMap, defaultChainMap } from '../../chain/chainMap';

interface ProxyParams {
  chainName?: string;
}

export const checkProxiesTool = (tools: PolkadotLangTools, chainMap: ChainMap = defaultChainMap) => {
  return new DynamicTool({
    name: "check_proxies",
    description: "Check proxy accounts on a specific chain",
    func: async (input: string) => {
      try {
        const params = JSON.parse(input) as ProxyParams;
        const chainName = params.chainName || Object.keys(chainMap)[0];
        
        if (!chainMap[chainName]) {
          return `Chain "${chainName}" not found in chainMap`;
        }

        const proxies = await tools.checkProxies(chainName);
        
        if (proxies.length === 1 && 'error' in proxies[0]) {
          return `Error checking proxies: ${proxies[0].error}`;
        }
        
        if (proxies.length === 0) {
          return `No proxy found on ${chainName}`;
        }
        
        return `Proxy info on ${chainName}: ${JSON.stringify(proxies, null, 2)}`;
      } catch (error) {
        if (error instanceof Error) {
          return `Error checking proxies: ${error.message}`;
        }
        return `Error checking proxies: ${String(error)}`;
      }
    }
  });
};