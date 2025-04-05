import { DynamicTool } from '@langchain/core/tools';
import { z } from 'zod';
import { PolkadotLangTools } from '../../tools/index';
import { buildAccountSigner } from '../../types/account';
import { teleportToRelayChain, teleportToParaChain } from '../../tools/xcm/teleport';
import { substrateApi } from '../../tools/substrace';
import { ChainMap, defaultChainMap } from '../../chain/chainMap';

interface XCMTransferParams {
  sourceChain: string;
  destinationChain: string;
  amount: number;
  address: string;
}

export const xcmTransfer = (tools: PolkadotLangTools, chainMap: ChainMap = defaultChainMap) => {
  const availableChains = Object.keys(chainMap);
  
  return new DynamicTool({
    name: 'xcmTransfer',
    description: `Transfer tokens between chains using XCM with your account. Available chains: ${availableChains.join(', ')}`,
    func: async (input: string) => {
      try {
        const params = JSON.parse(input) as XCMTransferParams;
        const { sourceChain, destinationChain, amount, address } = params;

        // Validate both chains exist
        if (!chainMap[sourceChain]) {
          throw new Error(`Source chain "${sourceChain}" does not exist in chainMap`);
        }
        
        if (!chainMap[destinationChain]) {
          throw new Error(`Destination chain "${destinationChain}" does not exist in chainMap`);
        }
        
        const sourceChainInfo = chainMap[sourceChain];
        const destChainInfo = chainMap[destinationChain];
        
        // Connect to source chain
        const { api, disconnect } = await substrateApi(
          { url: sourceChainInfo.url, name: sourceChainInfo.name }, 
          sourceChainInfo.apiKey
        );
        
        const signer = buildAccountSigner();
        let txHash: string;
        
        // Determine the appropriate XCM operation based on chain types
        if (sourceChainInfo.type === 'RelayChain' && destChainInfo.type === 'ParaChain') {
          // Relay → Parachain transfer
          const tx = teleportToParaChain(address, BigInt(amount * 1e12));
          const result = await tx.signAndSubmit(signer);
          txHash = await result.txHash.toString();
        } else if (sourceChainInfo.type === 'ParaChain' && destChainInfo.type === 'RelayChain') {
          // Parachain → Relay transfer
          const tx = teleportToRelayChain(address, BigInt(amount * 1e12));
          const result = await tx.signAndSubmit(signer);
          txHash = await result.txHash.toString();
        } else {
          throw new Error('Invalid chain combination for XCM transfer');
        }
        
        // Clean up connection
        await disconnect();
        
        return `XCM transfer initiated. Transaction hash: ${txHash}`;
      } catch (error) {
        if (error instanceof Error) {
          return `Error during XCM transfer: ${error.message}`;
        }
        return `Error during XCM transfer: ${String(error)}`;
      }
    }
  });
};