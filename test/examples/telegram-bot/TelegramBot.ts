import dotenv from 'dotenv';
import { Telegraf } from 'telegraf';
import { ChatOpenAI } from '@langchain/openai';
import { PolkadotAgentKit } from '../../../src/agent/index';
import { PolkadotLangTools } from '../../../src/tools/index';
import { Tool } from '@langchain/core/tools';
import { setupHandlers } from './handlers';
import { xcmTransfer } from '../../../src/langchain/xcm/index';
import { checkBalanceTool } from '../../../src/langchain/balance/index';
import { checkProxiesTool } from '../../../src/langchain/proxy/index';
import { ChainInfo, ChainMap } from '../../../src/chain/chainMap';
import { ChainConfig } from '../../../src/types/typeAgent';

dotenv.config();

interface BotConfig {
  botToken: string;
  openAiApiKey?: string;
  privateKey?: string;
  delegatePrivateKey?: string;
  chains: { url: string; name: string; apiKey: string; type: 'RelayChain' | 'ParaChain'; paraId?: number }[];
}

export class TelegramBot {
  private bot: Telegraf;
  private agent: PolkadotAgentKit;
  private llm: ChatOpenAI;
  private chainMap: ChainMap = {};
  private maxRetries = 5;
  private retryDelay = 10000; // 10 seconds

  constructor(config: BotConfig) {
    const {
      botToken,
      openAiApiKey = process.env.OPENAI_API_KEY || '',
      privateKey,
      delegatePrivateKey,
      chains,
    } = config;

    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN must be provided!');
    }

    this.bot = new Telegraf(botToken);

    chains.forEach(chain => {
      this.chainMap[chain.name] = chain as ChainInfo;
    });

    const agentChains = chains.map(chain => ({
      name: chain.name,
      url: chain.url,
      type: chain.type,
      paraId: chain.paraId
    }));

    this.agent = new PolkadotAgentKit({
      privateKey: privateKey || process.env.PRIVATE_KEY || '',
      delegatePrivateKey: delegatePrivateKey || process.env.DELEGATE_PRIVATE_KEY || '',
      chains: agentChains as ChainConfig[]
    });

    this.llm = new ChatOpenAI({
      openAIApiKey: openAiApiKey,
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.7
    });

    const tools: Record<string, Tool> = {
      xcmTransfer: xcmTransfer(new PolkadotLangTools(this.agent), this.chainMap),
      checkBalance: checkBalanceTool(new PolkadotLangTools(this.agent)),
      checkProxies: checkProxiesTool(new PolkadotLangTools(this.agent))
    };

    setupHandlers(this.bot, this.llm, tools);
  }

  private async retryOperation<T>(operation: () => Promise<T>, retries = this.maxRetries): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying operation in ${this.retryDelay}ms... (${retries} attempts remaining)`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.retryOperation(operation, retries - 1);
      }
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      await this.retryOperation(async () => {
        // Sử dụng Promise.race để xử lý timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 30000);
        });
        
        await Promise.race([
          this.bot.telegram.getMe(),
          timeoutPromise
        ]);
        
        await this.bot.launch();
        console.log('🤖 Telegram bot started successfully');
      });
    } catch (error) {
      console.error('❌ Failed to start Telegram bot:', error);
      if (error instanceof Error) {
        if (error.message.includes('ETIMEDOUT')) {
          console.error('Connection timed out. Please check your internet connection and try again.');
        } else if (error.message.includes('Unauthorized')) {
          console.error('Invalid Telegram bot token. Please check your TELEGRAM_BOT_TOKEN in .env file.');
        } else {
          console.error('Unknown error:', error.message);
        }
      }
      this.agent.disconnectAll();
      throw error;
    }
  }

  public stop(): void {
    this.bot.stop();
    this.agent.disconnectAll();
  }
}