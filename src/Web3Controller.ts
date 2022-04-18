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

import { BigNumber, ethers } from 'ethers';
import { EventEmitter } from 'events';
import {
    DefaultProviderOptions,
    IAssetParams,
    IChainlistChain,
    IChainParams,
    IContractFetchAbiOptions,
    IContractLoadOptions,
    IWatchAssetParams,
    IWeb3ControllerOptions
} from './Types';
import fetch from 'cross-fetch';
import Web3Modal, { IProviderOptions } from 'web3modal';
import MulticallProvider from './MulticallProvider';
import Metronome from 'node-metronome';
import Contract, { IContractCall } from './Contract';
import * as ls from 'local-storage';
import { sleep } from './Tools';
import ERC20 from './ERC20';
import { JSONRPCMethod } from 'walletlink/dist/provider/JSONRPC';

/** @ignore */
let Web3ControllerSingleton: any | undefined;

/** @ignore */
type ChainlistMap = Map<number, IChainlistChain>;

/** @ignore */
let ChainListCache: ChainlistMap = new Map<number, IChainlistChain>();

export default class Web3Controller extends EventEmitter {
    private readonly modal?: Web3Modal;
    private _checkTimer?: Metronome;
    private _instance?: any;

    private constructor (
        private readonly _appName: string,
        private readonly _requestedChainId: number,
        private readonly _providerOptions: IProviderOptions = DefaultProviderOptions,
        private readonly _cacheProvider = true,
        private readonly _chainList: ChainlistMap = ChainListCache,
        private readonly _defaultProvider: ethers.providers.Provider
    ) {
        super();

        for (const [, chain] of this._chainList) {
            if (chain.chainId !== this._requestedChainId) {
                continue;
            }

            if (chain.rpc.length !== 0) {
                if (this._providerOptions.walletconnect) {
                    this._providerOptions.walletconnect.options.rpc[chain.chainId] = chain.rpc[0];
                }

                if (this._providerOptions['custom-walletlink']) {
                    this._providerOptions['custom-walletlink'].options.rpc = chain.rpc[0];
                    this._providerOptions['custom-walletlink'].options.chainId = chain.chainId;
                    this._providerOptions['custom-walletlink'].options.appName = this._appName;
                }
            }
        }

        if (typeof window !== 'undefined') {
            this.modal = new Web3Modal({
                network: 'mainnet',
                cacheProvider: this._cacheProvider,
                providerOptions: this._providerOptions
            });
        }
    }

    /**
     * Returns the current application name
     */
    public get name (): string {
        return this._appName;
    }

    /**
     * Returns the currently connected provider interface
     *
     */
    public get provider (): ethers.providers.Provider {
        return this.web3Provider || this.defaultProvider;
    }

    /**
     * Returns the signer if available
     */
    public get signer (): ethers.Signer | undefined {
        return this.web3Provider?.getSigner();
    }

    /**
     * Returns if the controller is connected to a signer
     */
    public get connected (): boolean {
        return (typeof this.signer !== 'undefined');
    }

    /**
     * Returns if a provider is cached for the modal
     */
    public get isCached (): boolean {
        if (!this.modal) {
            return false;
        }

        return (this._cacheProvider &&
            typeof this.modal.cachedProvider !== 'undefined' &&
            this.modal.cachedProvider.length !== 0);
    }

    private _web3Provider?: ethers.providers.Web3Provider;

    /**
     * Returns a web3 provider interface if connected
     *
     * @private
     */
    private get web3Provider (): ethers.providers.Web3Provider | undefined {
        return this._web3Provider;
    }

    /**
     * Returns the default provider
     *
     * @private
     */
    private get defaultProvider (): ethers.providers.Provider {
        return this._defaultProvider;
    }

    /**
     * Loads a singleton of the controller object
     *
     * @param appName
     * @param options
     */
    public static async load (
        appName = 'Unknown Application',
        options?: IWeb3ControllerOptions
    ): Promise<Web3Controller> {
        if (Web3ControllerSingleton) {
            return Web3ControllerSingleton;
        }

        options ||= {};

        if (!options.chainId) {
            throw new Error('Must specify chain ID');
        }

        options.providerOptions ||= DefaultProviderOptions;

        let provider: ethers.providers.Provider;

        if (options.jsonRpcProvider) {
            provider = new ethers.providers.JsonRpcBatchProvider(options.jsonRpcProvider);
        } else if (options.webSocketProvider) {
            provider = new ethers.providers.WebSocketProvider(options.webSocketProvider);
        } else {
            const chains = await Web3Controller.getChains();

            const chain = chains.get(options.chainId);

            if (!chain) {
                throw new Error('Could not find an acceptable provider, please specify one.');
            }

            provider = new ethers.providers.JsonRpcProvider(chain.rpc[0], options.chainId);
        }

        const instance = new Web3Controller(
            appName,
            options.chainId,
            options.providerOptions,
            true,
            await this.getChains(),
            provider
        );

        Web3ControllerSingleton = instance;

        return instance;
    }

    /**
     * Retrieves a list of EVM chains from chainid.network
     *
     * @param listUrl
     * @param forceRefresh
     * @private
     */
    public static async getChains (
        listUrl = 'https://chainid.network/chains.json',
        forceRefresh = false
    ): Promise<ChainlistMap> {
        if (ChainListCache.size !== 0 && !forceRefresh) {
            return ChainListCache;
        }

        const response = await fetch(listUrl);

        if (!response.ok) {
            throw new Error('Could not fetch chain list');
        }

        const json: IChainlistChain[] = await response.json();

        const result = new Map<number, IChainlistChain>();

        for (const chain of json.filter(elem => elem.rpc.length !== 0)) {
            chain.rpc = chain.rpc.filter(elem => !elem.includes('$'));
            result.set(chain.chainId, chain);
        }

        ChainListCache = result;

        return result;
    }

    public on(event: 'accountsChanged', listener: (accounts: string[]) => void): this;

    public on(event: 'chainChanged', listener: (chainId: number) => void): this;

    public on(event: 'connect', listener: (chainId: number) => void): this;

    public on(event: 'disconnect', listener: (error: { code: number, message: string }) => void): this;

    public on(event: 'error', listener: (error: Error) => void): this;

    public on (event: any, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    /**
     * Returns the currently connected chain ID
     */
    public async chainId (): Promise<number> {
        return (await this.provider.getNetwork()).chainId;
    }

    /**
     * Signs a message using the connected signer
     *
     * @param message
     */
    public async signMessage (message: ethers.Bytes | string): Promise<string> {
        if (!this.signer) {
            throw new Error('Signer is not connected');
        }

        return this.signer?.signMessage(message);
    }

    /**
     * Displays a modal to allow a user to connect their wallet
     *
     * @param forceNetwork
     */
    public async showWeb3Modal (forceNetwork = false): Promise<void> {
        if (this.connected) {
            await this.disconnect();
        }

        try {
            await this._connectWeb3Provider();
        } catch (error: any) {
            await this.disconnect();

            throw error;
        }

        if (!this.web3Provider || !this.signer) {
            throw new Error('Could not connect Web3 provider');
        }

        if (forceNetwork) {
            try {
                await this.switchChain(this._requestedChainId);
            } catch (error: any) {
                await this.disconnect();

                throw error;
            }
        }

        this._checkTimer = new Metronome(500, true);

        this._checkTimer.on('tick', async () => {
            if (!this._checkTimer) {
                return;
            }

            try {
                this._checkTimer.paused = true;

                if (!this.signer || (await this.signer.getAddress()).length === 0) {
                    return this.disconnect(-1, 'Signer not connected');
                } else if (forceNetwork && (await this.signer.getChainId()) !== this._requestedChainId) {
                    await this.switchChain(this._requestedChainId);
                }
            } catch {
            } finally {
                this._checkTimer.paused = false;
            }
        });
    }

    /**
     * Disconnects the connected instance
     *
     * @param code
     * @param message
     * @param clearCacheProvider
     */
    public async disconnect (
        code = -1,
        message = 'Disconnected from wallet provider',
        clearCacheProvider = true
    ): Promise<void> {
        if (this.modal) {
            if ((!this._cacheProvider || clearCacheProvider) && this.modal.clearCachedProvider) {
                this.modal.clearCachedProvider();
            }
        }

        if (this.defaultProvider instanceof ethers.providers.WebSocketProvider) {
            await this.defaultProvider.destroy();
        }

        if (this.web3Provider && (this.web3Provider as any).close) {
            await (this.web3Provider as any).close();
        }

        if (this.web3Provider && (this.web3Provider as any).disconnect) {
            await (this.web3Provider as any).disconnect();
        }

        this._checkTimer?.destroy();

        if (this.connected) {
            this.emit('disconnect', { code, message });
        }

        this._web3Provider = undefined;
    }

    /**
     * Execute the specified mutlicall commands
     *
     * @param calls
     */
    public async multicall<Type extends any[] = any[]> (calls: IContractCall[]): Promise<Type> {
        const provider = await this._constructMulticallProvider();

        return provider.aggregate(calls);
    }

    /**
     * Attempts to fetch the ABI information for the specified contract from an explorer
     *
     * @param contract_address
     * @param options
     */
    public async fetchABI (
        contract_address: string,
        options?: IContractFetchAbiOptions
    ): Promise<string> {
        options ||= {};
        options.chainId ||= await this.chainId();
        options.force_refresh ||= false;

        const cacheId = options.chainId + '_' + contract_address;

        if (!options.force_refresh) {
            const abi = ls.get<string>(cacheId);

            if (abi && abi.length !== 0) {
                return abi;
            }
        }

        const chain = this._chainList.get(options.chainId);

        if (!chain || chain.explorers.length === 0) {
            throw new Error('Cannot automatically fetch ABI for chain: ' + options.chainId);
        }

        const url = chain.explorers[0].url
            .replace('https://', 'https://api.') +
            '/api?module=contract&action=getabi&address=' +
            contract_address;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Could not fetch ABI from explorer: ' + url);
        }

        const json = await response.json();

        if (json.result && json.status === '1') {
            ls.set(cacheId, json.result);

            return json.result;
        }

        await sleep(5);

        return this.fetchABI(contract_address, options);
    }

    /**
     * Loads the specified contract using the connected or specified signer || provider
     *
     * @param contract_address
     * @param contract_abi
     * @param options
     */
    public async loadContract (
        contract_address: string,
        contract_abi?: ethers.ContractInterface,
        options?: IContractLoadOptions
    ): Promise<Contract> {
        options ||= {};
        options.chainId ||= await this.chainId();
        options.force_refresh ||= false;
        options.provider ||= this.signer || this.provider;

        if (!contract_abi) {
            contract_abi = await this.fetchABI(contract_address, options);
        }

        // try to activate a multicall provider if it isn't already one
        try {
            if (!(options.provider instanceof MulticallProvider)) {
                if (options.provider instanceof ethers.providers.Provider) {
                    options.provider = await MulticallProvider.create(options.provider);
                } else if (options.provider) {
                    options.provider = await MulticallProvider.create(
                        options.provider.provider || this.provider);
                }
            }
        } catch {
        }

        return new Contract(contract_address, contract_abi, options.provider);
    }

    /**
     * Requests to add an asset for tracking to the connected wallet
     *
     * @param contract_address
     * @param options
     */
    public async watchAsset (
        contract_address: string,
        options?: IAssetParams
    ): Promise<void> {
        if (!this.web3Provider) {
            throw new Error('Web3 provider not connected');
        }

        options ||= {};

        const token = new ERC20(await this.loadContract(contract_address));

        options.symbol ||= await token.symbol();
        options.decimals ||= await token.decimals();

        const watch: IWatchAssetParams = {
            type: 'ERC20',
            options: {
                address: contract_address,
                symbol: options.symbol,
                decimals: options.decimals,
                image: options.logo || ''
            }
        };

        await this.web3Provider.send(JSONRPCMethod.wallet_watchAsset, watch as any);
    }

    /**
     * Requests to switch to the specified chain/network
     *
     * @param chainId
     */
    public async switchChain (chainId = this._requestedChainId): Promise<void> {
        if (!this.web3Provider) {
            throw new Error('Web3 provider not connected');
        }

        if (await this.chainId() === chainId) {
            return;
        }

        let hex = BigNumber.from(chainId).toHexString();

        while (hex.includes('0x0')) {
            hex = hex.replace('0x0', '0x');
        }

        try {
            await this.web3Provider.send(JSONRPCMethod.wallet_switchEthereumChain, [{
                chainId: hex
            }]);
        } catch (error: any) {
            if (error.code === 4902) {
                await this.addChain(chainId);

                return this.switchChain(chainId);
            }

            throw error;
        }
    }

    /**
     * Requests to add the specified chain/network to the web3 provider
     *
     * @param chainId
     * @param options
     */
    public async addChain (
        chainId = this._requestedChainId,
        options?: IChainParams
    ): Promise<void> {
        if (!this.web3Provider) {
            throw new Error('Web3 provider not connected');
        }

        if (await this.chainId() === chainId) {
            return;
        }

        let hex = BigNumber.from(chainId).toHexString();

        while (hex.includes('0x0')) {
            hex = hex.replace('0x0', '0x');
        }

        options ||= {};

        const chain = this._chainList.get(chainId);

        if (chain) {
            options.chainName ||= chain.name;
            options.nativeCurrency ||= chain.nativeCurrency;
            options.rpcUrls ||= chain.rpc.filter(elem => !elem.toLowerCase().includes('INFURA'));
            options.blockExplorerUrls ||= (chain.explorers)
                ? chain.explorers.map(elem => elem.url)
                : undefined;
            options.iconUrls ||= chain.icon || '';
        }

        await this.web3Provider.send(JSONRPCMethod.wallet_addEthereumChain, [{
            chainId: hex,
            chainName: options.chainName || 'Unknown',
            nativeCurrency: options.nativeCurrency,
            rpcUrls: options.rpcUrls,
            blockExplorerUrls: options.blockExplorerUrls,
            iconUrls: options.iconUrls
        }]);
    }

    /**
     * Constructs a multicall provider on demand
     *
     * @private
     */
    private async _constructMulticallProvider (): Promise<MulticallProvider> {
        return MulticallProvider.create(this.provider);
    }

    /**
     * Uses the web3modal library to display the web3 modal to the user
     *
     * @param refresh
     *
     * @private
     */
    private async _connectWeb3Provider (refresh = false): Promise<void> {
        if (!refresh) {
            if (!this.modal) {
                throw new Error('Must be called from a browser');
            }

            if (!this._cacheProvider && this.modal.clearCachedProvider) {
                await this.modal.clearCachedProvider();
            }

            this._instance = await this.modal.connect();

            this._instance.on('connect', async (info: { chainId: any }) => {
                await this._connectWeb3Provider(true);

                this.emit('connect', BigNumber.from(info.chainId).toNumber());
            });

            this._instance.on('disconnect', (error: { code: number, message: string }) => {
                this.emit('disconnect', error);
            });

            this._instance.on('accountsChanged', async (accounts: string[]) => {
                await this._connectWeb3Provider(true);

                this.emit('accountsChanged', accounts);
            });

            this._instance.on('chainChanged', async (chainId: any) => {
                await this._connectWeb3Provider(true);

                this.emit('chainChanged', BigNumber.from(chainId).toNumber());
            });

            this._instance.on('error', (error: any) => {
                this.emit('error', error);
            });
        }

        this._web3Provider = new ethers.providers.Web3Provider(this._instance);
    }
}
