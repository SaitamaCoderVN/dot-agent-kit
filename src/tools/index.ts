import { PolkadotAgentKit } from '../agent/index';
import { teleportToParaChain, teleportToRelayChain } from '../../src/tools/xcm/teleport/teleport';
import { buildAccountSigner } from '../types/account';

export class PolkadotTools {
  private agent: PolkadotAgentKit;

  constructor(agent: PolkadotAgentKit) {
    this.agent = agent;
  }

  async xcmTransferToRelayChain(chainName: string, amount: bigint, recipient?: string): Promise<string> {
    console.log(`xcmTransferToRelayChain called: ${chainName}, amount: ${amount}`);
    const { api } = this.agent.getConnection(chainName);
    const signer = buildAccountSigner();
    const tx = teleportToRelayChain(recipient || this.agent.address, amount);
    const result = await tx.signAndSubmit(signer);
    if (!result || !result.txHash) {
      throw new Error('Transaction result or txHash is undefined');
    }
    console.log(`xcmTransferToRelayChain result: ${result.txHash.toString()}`);
    return result.txHash.toString();
  }

  async xcmTransferToParaChain(chainName: string, amount: bigint, paraId: number = 1000): Promise<string> {
    console.log(`xcmTransferToParaChain called: ${chainName}, amount: ${amount}`);
    const { api } = this.agent.getConnection(chainName);
    const signer = buildAccountSigner();
    const tx = teleportToParaChain(this.agent.address, amount);
    const result = await tx.signAndSubmit(signer);
    if (!result || !result.txHash) {
      throw new Error('Transaction result or txHash is undefined');
    }
    console.log(`xcmTransferToParaChain result: ${result.txHash.toString()}`);
    return result.txHash.toString();
  }
}