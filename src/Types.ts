// Copyright (c) 2021-2022, Brandon Lehmann <brandonlehmann@gmail.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { IProviderOptions } from 'web3modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk/dist/CoinbaseWalletSDK';
import { ethers } from 'ethers';
import MulticallProvider from './MulticallProvider';

/**
 * Representation of the NULL address
 */
export const NullAddress = '0x0000000000000000000000000000000000000000';

/**
 * Representation of the NULL+1 address
 */
export const Null1Address = '0x0000000000000000000000000000000000000001';

/** @ignore */
export interface IWatchAssetParams {
    type: 'ERC20'; // In the future, other standards will be supported
    options: {
        address: string; // The address of the token contract
        symbol: string; // A ticker symbol or shorthand, up to 5 characters
        decimals: number; // The number of token decimals
        image: string; // A string url of the token logo
    };
}

/**
 * Represents asset parameters that are used when attempting to add
 * the token to the watch of a web3 provider
 */
export interface IAssetParams {
    symbol?: string;
    decimals?: number;
    name?: string;
    logo?: string;
}

/**
 * Represents chain parameters that are used when attempting to add
 * a chain to a web3 provider
 */
export interface IChainParams {
    chainName?: string;
    nativeCurrency?: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpcUrls?: string[];
    blockExplorerUrls?: string[];
    iconUrls?: string;
}

/**
 * Represents a chainlist object that has information about
 * each of the chains that were tracked on chainlist.org
 */
export interface IChainlistChain {
    name: string;
    chain: string;
    network: string;
    icon: string;
    rpc: string[];
    faucets: string[];
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    infoURL: string;
    shortName: string;
    chainId: number;
    networkId: number;
    slip44: number;
    ens: {
        registry: string;
    };
    explorers: {
        name: string;
        url: string;
        standard: string;
    }[];
}

/**
 * Represents Web3 controller options
 */
export interface IWeb3ControllerOptions {
    providerOptions?: IProviderOptions;
    chainId?: number;
    jsonRpcProvider?: string;
    webSocketProvider?: string;
    noSingleton?: boolean;
}

/**
 * Represents default Web3 modal options
 */
export const DefaultProviderOptions: IProviderOptions = {
    walletconnect: {
        package: WalletConnectProvider,
        options: {
            rpc: {}
        }
    },
    'custom-walletlink': {
        package: CoinbaseWalletSDK,
        display: {
            logo: 'https://raw.githubusercontent.com/Web3Modal/web3modal/master/src/providers/logos/coinbase.svg',
            name: 'Coinbase Wallet',
            description: 'Connect to your Coinbase Wallet'
        },
        options: {
            rpc: '',
            appName: '',
            chainId: 0
        },
        connector: async (_, options) => {
            const { appName, rpc, chainId } = options;

            const instance = new CoinbaseWalletSDK({
                appName
            });

            const provider = instance.makeWeb3Provider(rpc, chainId);

            if (provider.isConnected()) {
                provider.disconnect();
            }

            await provider.enable();
            return provider;
        }
    }
};

/**
 * Represents contract fetch abi optins
 */
export interface IContractFetchAbiOptions {
    chainId?: number;
    force_refresh?: boolean;
}

/**
 * Represents contract load options
 */
export interface IContractLoadOptions extends IContractFetchAbiOptions {
    provider?: ethers.Signer | ethers.providers.Provider | MulticallProvider;
}

/**
 * Represents asset types found in image properties of some token types
 */
export enum NFTAssetType {
    IMAGE,
    GIF,
    VIDEO,
    UNKNOWN
}
