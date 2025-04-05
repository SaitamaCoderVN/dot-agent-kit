import { Telegraf } from 'telegraf';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { Tool } from '@langchain/core/tools';

const SYSTEM_PROMPT = `I am a Telegram bot powered by PolkadotAgentKit. I can assist you with:
- Transferring tokens between chains using XCM (e.g., "transfer 1 token to westend_asset_hub to 5CSox4ZSN4SGLKUG9NYPtfVK9sByXLtxP4hmoF4UgkM4jgDJ")
- Checking WND balance on Westend (e.g., "check balance")
- Checking proxies (e.g., "check proxies on westend" or "check proxies")

When transferring tokens, please provide:
1. The amount of tokens to transfer (e.g., 1)
2. The name of the destination chain (e.g., westend, westend_asset_hub)
3. The address to receive the tokens (e.g., 5CSox4ZSN4SGLKUG9NYPtfVK9sByXLtxP4hmoF4UgkM4jgDJ)

Suggested syntax: "transfer [amount] token to [chain name] to [address]"

When checking proxies, you can specify the chain (e.g., "check proxies on westend") or 
not specify a chain (the first chain will be used by default)

Please provide instructions, and I will assist you!`;

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

async function retryOperation<T>(operation: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying operation in ${RETRY_DELAY}ms... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return retryOperation(operation, retries - 1);
    }
    throw error;
  }
}

export function setupHandlers(
  bot: Telegraf,
  llm: ChatOpenAI,
  tools: Record<string, Tool>,
): void {
  bot.start((ctx) => {
    ctx.reply(
      'Welcome to Polkadot Bot!\n' +
      'I can assist you with:\n' +
      '- Transferring XCM tokens (e.g., "transfer 1 token to westend_asset_hub to 5CSox4ZSN4SGLKUG9NYPtfVK9sByXLtxP4hmoF4UgkM4jgDJ")\n' +
      '- Checking WND balance (e.g., "check balance")\n' +
      '- Checking proxies (e.g., "check proxies on westend" or "check proxies")\n' +
      'Try asking something!',
    );
  });

  bot.on('text', async (ctx) => {
    const message = ctx.message.text;
    console.log(`Received message: ${message}`);
    if (message.startsWith('/')) return;

    try {
      await retryOperation(async () => {
        const llmWithTools = llm.bindTools(Object.values(tools));
        const messages = [
          new SystemMessage({ content: SYSTEM_PROMPT }),
          new HumanMessage({ content: message }),
        ];

        const response = await llmWithTools.invoke(messages);
        const content = typeof response.content === 'string' 
          ? response.content 
          : JSON.stringify(response.content);
        
        await ctx.reply(content);
      });
    } catch (error) {
      console.error('Error processing message:', error);
      let errorMessage = 'Sorry, I encountered an error while processing your request.';
      
      if (error instanceof Error) {
        if (error.message.includes('ETIMEDOUT')) {
          errorMessage += ' The connection timed out. Please try again later.';
        } else if (error.message.includes('rate limit')) {
          errorMessage += ' The service is currently busy. Please wait a moment and try again.';
        }
      }
      
      await ctx.reply(errorMessage);
    }
  });

  bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}:`, err);
    ctx.reply('An error occurred. Please try again later.');
  });
}