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

import Web3Modal, {IProviderOptions} from 'web3modal';
import {ethers, BigNumber, Multicall, Contract, IContractCall} from '@brandonlehmann/ethers-providers';
import {EventEmitter} from 'events';
import WalletConnectProvider from '@walletconnect/web3-provider';
import {WalletLink} from 'walletlink/dist/WalletLink';
import Metronome from 'node-metronome';
import * as ls from 'local-storage';
import {sleep} from './Tools';
import fetch from 'cross-fetch';

export const NullAddress = '0x0000000000000000000000000000000000000000';

interface IChainlistChain {
    chain: string;
    chainId: number;
    infoURL: string;
    ens: {
        registry: string;
    };
    explorers: {
        name: string;
        url: string;
        standard: string;
    }[];
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    networkId: number;
    rpc: string[];
    shortName: string;
    slip44: number;
}

export const DefaultProviderOptions: IProviderOptions = {
    walletconnect: {
        package: WalletConnectProvider,
        options: {
            rpc: {}
        }
    },
    'custom-walletlink': {
        package: WalletLink,
        display: {
            logo: 'https://play-lh.googleusercontent.com/' +
                'wrgUujbq5kbn4Wd4tzyhQnxOXkjiGqq39N4zBvCHmxpIiKcZw_Pb065KTWWlnoejsg=s360-rw',
            name: 'Coinbase Wallet',
            description: 'Connect to Coinbase Wallet'
        },
        options: {
            rpc: '',
            appName: '',
            chainId: 0
        },
        connector: async (_, options) => {
            const { appName, rpc, chainId } = options;
            const instance = new WalletLink({
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

export {ethers, BigNumber, IProviderOptions};

let Web3ControllerSingleton: any;

/** @ignore */
type ChainlistMap = Map<number, IChainlistChain>;

export default class Web3Controller extends EventEmitter {
    private _connected = false;
    private _instance?: Multicall;
    private _signer?: ethers.Signer;
    public modal?: Web3Modal;
    private _checkTimer?: Metronome;

    protected constructor(
        public readonly appName: string,
        private readonly providerOptions: IProviderOptions = DefaultProviderOptions,
        public readonly cacheProvider = false,
        private readonly _chains: ChainlistMap,
        private readonly _defaultProvider?: Multicall
    ) {
        super();

        if (typeof window !== 'undefined') {
            this.modal = new Web3Modal({
                network: 'mainnet',
                cacheProvider: this.cacheProvider,
                providerOptions: this.providerOptions
            });
        }
    }

    public on(event: 'accountsChanged', listener: (accounts: string[]) => void): this;

    public on(event: 'chainChanged', listener: (chainId: number) => void): this;

    public on(event: 'connected', listener: (info: {chainId: number}) => void): this;

    public on(event: 'disconnected', listener: (error: {code: number, message: string}) => void): this;

    public on (event: any, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    /**
     * Loads the singleton instance of the widget controller
     *
     * @param appName
     * @param providerOptions
     * @param cacheProvider
     * @param chainId
     */
    public static async load (
        appName = 'Unknown Application',
        providerOptions: IProviderOptions = DefaultProviderOptions,
        chainId?: number,
        cacheProvider = false
    ): Promise<Web3Controller> {
        if (Web3ControllerSingleton) {
            return Web3ControllerSingleton;
        }

        const chains = await Web3Controller.getChains();

        if (chainId) {
            const entry = chains.get(chainId);

            if (entry) {
                entry.rpc = entry.rpc.filter(elem => !elem.includes('$'));

                if (entry.rpc.length !== 0) {
                    const provider = new ethers.providers.JsonRpcProvider(entry.rpc[0]);
                    const instance = new Web3Controller(
                        appName,
                        providerOptions,
                        cacheProvider,
                        chains,
                        await Multicall.create(provider)
                    );
                    Web3ControllerSingleton = instance;
                    return instance;
                }
            }
        }

        const instance = new Web3Controller(appName, providerOptions, cacheProvider, chains);

        Web3ControllerSingleton = instance;

        return instance;
    }

    /**
     * Returns if the widget is connected to web3
     */
    public get connected (): boolean {
        return this._connected;
    }

    /**
     * Returns the connected signer
     */
    public get signer (): ethers.Signer | undefined {
        if (this.connected && this._signer) {
            return this._signer;
        }
    }

    /**
     * Returns the currently connected chain ID
     */
    public async chainId (): Promise<number> {
        if (this.signer) {
            return this.signer.getChainId();
        } else if (this.provider) {
            return (await this.provider.getNetwork()).chainId;
        }
        return 0;
    }

    /**
     * Returns the connected Web3 provider
     */
    public get provider (): ethers.providers.Provider {
        if (this.connected && this._instance) {
            return this._instance.provider;
        } else if (this._defaultProvider) {
            return this._defaultProvider.provider;
        }

        throw new Error('No provider connected');
    }

    /**
     * Returns if there is a cached provider present
     */
    public get isCached(): boolean {
        if (!this.modal) {
            return false;
        }

        return (this.cacheProvider &&
            typeof this.modal.cachedProvider !== 'undefined' &&
            this.modal.cachedProvider.length !== 0);
    }

    /**
     * Attempts to fetch the ABI information for the specified contract from an explorer
     *
     * @param contract_address
     * @param chainId
     * @param force_refresh
     */
    public async fetchABI (
        contract_address: string,
        chainId?: number,
        force_refresh = false
    ): Promise<string> {
        const connectedChainId = chainId || await this.chainId();

        const cacheId = connectedChainId + '_' + contract_address;

        if (!force_refresh) {
            const abi = ls.get<string>(cacheId);

            if (abi && abi.length !== 0) {
                return abi;
            }
        }

        let url = '';

        const chain = this._chains.get(connectedChainId);

        if (chain && chain.explorers.length !== 0) {
            url = chain.explorers[0].url.replace('https://', 'https://api.');
            url += '/api?module=contract&action=getabi&address=' + contract_address;
        }

        if (url.length === 0) {
            throw new Error('Cannot find explorer for chain: ' + connectedChainId);
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Could not fetch ABI');
        }

        const json = await response.json();

        if (json.result && json.status === '1') {
            ls.set(cacheId, json.result);

            return json.result;
        }

        await sleep(5);

        return this.fetchABI(contract_address);
    }

    /**
     * Loads the specified contract using the connected signer
     *
     * @param contract_address
     * @param contract_abi
     * @param provider
     * @param chainId
     * @param force_refresh
     */
    public async loadContract (
        contract_address: string,
        contract_abi?: string,
        provider?: ethers.Signer | ethers.providers.Provider | Multicall,
        chainId?: number,
        force_refresh = false
    ): Promise<Contract> {
        if (!contract_abi) {
            contract_abi = await this.fetchABI(contract_address, chainId, force_refresh);
        }

        let contractProvider = provider || this.signer || this.provider;

        if (!(contractProvider instanceof Multicall) && (contractProvider instanceof ethers.providers.Provider)) {
            contractProvider = await Multicall.create(contractProvider);
        }

        return new Contract(
            contract_address,
            contract_abi,
            contractProvider);
    }

    /**
     * Displays the web3 modal and connects to it
     */
    public async showWeb3Modal (): Promise<number> {
        if (this.connected) {
            await this.disconnect();
        }

        if (this.providerOptions['custom-walletlink']) {
            this.providerOptions['custom-walletlink'].options.appName = this.appName;
        }

        for (const [,chain] of this._chains) {
            if (chain.rpc.length !== 0) {
                if (this.providerOptions.walletconnect) {
                    this.providerOptions.walletconnect.options.rpc[chain.chainId] = chain.rpc[0];
                }

                if (this.providerOptions['custom-walletlink']) {
                    this.providerOptions['custom-walletlink'].options.rpc = chain.rpc[0];
                    this.providerOptions['custom-walletlink'].options.chainId = chain.chainId;
                }
            }
        }

        this.modal = new Web3Modal({
            network: 'mainnet',
            cacheProvider: this.cacheProvider,
            providerOptions: this.providerOptions
        });

        if (!this.cacheProvider && this.modal.clearCachedProvider) {
            await this.modal.clearCachedProvider();
        }

        const _instance = await this.modal.connect();

        if (!_instance) {
            throw new Error('Web3Provider is undefined');
        }

        _instance.on('accountsChanged', (accounts: string[]) => {
            this.emit('accountsChanged', accounts);
        });

        _instance.on('chainChanged', (chainId: number) => {
            this.emit('chainChanged', BigNumber.from(chainId).toNumber());
        });

        _instance.on('connect', (info: {chainId: number}) => {
            this._connected = true;

            this.emit('connect', { chainId: BigNumber.from(info.chainId).toNumber() });
        });

        _instance.on('disconnect', async (error: {code: number, message: string}) => {
            await this.disconnect();

            this.emit('disconnect', error);
        });

        const instance = new ethers.providers.Web3Provider(_instance as any);

        this._instance = await Multicall.create(instance);

        this._signer = instance.getSigner();

        this._checkTimer = new Metronome(500, true);

        this._checkTimer.on('tick', async () => {
            try {
                if (!this.signer) {
                    throw new Error('not connected');
                }

                const address = await this.signer.getAddress();

                if (address.length === 0) {
                    throw new Error('not connected');
                }
            } catch {
                await this.disconnect();

                this.emit('disconnect', { code: -1, message: 'Disconnected from provider' });
            }
        });

        this._connected = true;

        return this.chainId();
    }

    /**
     * Disconnects the provider/signer/controller
     * @param clearCachedProvider whether to force the clearing of the cached provider
     */
    public async disconnect (clearCachedProvider = false) {
        if (this.modal) {
            if ((!this.cacheProvider || clearCachedProvider) && this.modal.clearCachedProvider) {
                this.modal.clearCachedProvider();
            }
        }

        if (this._instance && (this._instance.provider as any).close) {
            await (this._instance.provider as any).close();
        }

        if (this._instance && (this._instance.provider as any).disconnect) {
            await (this._instance.provider as any).disconnect();
        }

        if (this._checkTimer) {
            this._checkTimer.destroy();
        }

        this._instance = undefined;

        this._connected = false;

        this._signer = undefined;

        this.emit('disconnect', { code: -1, message: 'Wallet disconnected' });
    }

    /**
     * Retrieves a list of EVM chains from chainlist.org
     *
     * @param listUrl
     * @protected
     */
    protected static async getChains (
        listUrl = 'https://cloudflare-ipfs.com/ipfs/Qma4DkUFVDmLiYZHrmCVPh3fxrJM7TgskPymTJnQmcFhaW'
    ): Promise<ChainlistMap> {
        const response = await fetch(listUrl);

        if (!response.ok) {
            throw new Error('Could not fetch chain list');
        }

        const json: IChainlistChain[] = await response.json();

        const result = new Map<number, IChainlistChain>();

        for (const chain of json) {
            chain.rpc = chain.rpc.filter(elem => !elem.includes('$'));
            result.set(chain.chainId, chain);
        }

        return result;
    }

    /**
     * Execute the specified multicall
     *
     * @param calls
     */
    public async multicall<Type extends any[] = any[]>(calls: IContractCall[]): Promise<Type> {
        if (this.connected && this._instance) {
            return this._instance?.multicall(calls);
        } else if (this._defaultProvider) {
            return this._defaultProvider.multicall(calls);
        }

        throw new Error('Provider not connected');
    }
}
