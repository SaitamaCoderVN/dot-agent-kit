import { Chain } from '../tools/substrace';

export interface ChainInfo {
  url: string;
  name: string;
  apiKey: Chain;
  type: 'RelayChain' | 'ParaChain';
  paraId?: number;
}

export interface ChainMap {
  [key: string]: ChainInfo;
}

export const defaultChainMap: ChainMap = {
  'westend': {
    url: 'wss://westend-rpc.dwellir.com',
    name: 'westend2',
    apiKey: 'westend2',
    type: 'RelayChain'
  },
  'westend_asset_hub': {
    url: 'wss://westmint-rpc-tn.dwellir.com',
    name: 'westend2_asset_hub',
    apiKey: 'westend2_asset_hub',
    type: 'ParaChain',
    paraId: 1000
  }
};
