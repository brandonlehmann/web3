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

import { ethers } from 'ethers';
import MulticallProvider from './MulticallProvider';
import { sleep } from './Tools';

/**
 * Represents a contract call that can be used to construct a byteform ABI call
 */
export interface IContractCall {
    contract: {
        address: string;
    };
    name: string;
    inputs: ethers.utils.ParamType[];
    outputs: ethers.utils.ParamType[];
    params: any[];
}

/** @ignore */
interface IContractType extends ethers.Contract {
    exec: <Type extends any[] = any[]>() => Promise<Type>;
    callMethod: (name: string, ...params: any[]) => IContractCall;
    call: (name: string, ...params: any[]) => IContractType;
}

/**
 * Represents an extension to ethers.Contract that allows us to easily dump out
 * the contract calls so that they can be used within a multicall execution pattern
 */
export default class Contract extends ethers.Contract implements IContractType {
    public readonly multicallProvider?: MulticallProvider;
    protected _callChain: IContractCall[] = [];
    private _callMethods: Map<string, IContractCall> = new Map<string, IContractCall>();
    private readonly _addressOrName: string;
    private readonly _contractInterface: ethers.ContractInterface;
    private readonly _signerOrProvider: ethers.Signer | ethers.providers.Provider | MulticallProvider | undefined;

    /**
     * Creates a new instance of the object
     *
     * @param addressOrName
     * @param contractInterface
     * @param signerOrProvider
     */
    constructor (
        addressOrName: string,
        contractInterface: ethers.ContractInterface,
        signerOrProvider?: ethers.Signer | ethers.providers.Provider | MulticallProvider) {
        super(
            addressOrName,
            contractInterface,
            (signerOrProvider instanceof MulticallProvider) ? signerOrProvider.provider : signerOrProvider
        );

        this._addressOrName = addressOrName;
        this._contractInterface = contractInterface;
        this._signerOrProvider = signerOrProvider;

        if (signerOrProvider instanceof MulticallProvider) {
            this.multicallProvider = signerOrProvider;
        }

        for (const fragment of this.interface.fragments) {
            if (fragment.type !== 'function') {
                continue;
            }

            const func = ethers.utils.FunctionFragment.from(fragment);

            if (func.stateMutability === 'pure' || func.stateMutability === 'view') {
                this._callMethods.set(func.name, {
                    contract: {
                        address: this.address
                    },
                    name: func.name,
                    inputs: func.inputs,
                    outputs: func.outputs || [],
                    params: []
                });
            }
        }
    }

    /**
     * Automatically keeps trying the call unless we get a revert exception
     *
     * @param func
     * @param params
     */
    public async retryCall<T> (func: (...args: any[]) => Promise<T>, ...params: any[]): Promise<T> {
        try {
            return func(...params);
        } catch (e: any) {
            if (e.toString().toLowerCase().includes('revert exception')) {
                throw e;
            }

            await sleep(1);

            return this.retryCall(func);
        }
    }

    /**
     * Creates a chainable list of contract calls
     *
     * @param name
     * @param params
     */
    public call (name: string, ...params: any[]): Contract {
        const result = new Contract(this._addressOrName, this._contractInterface, this._signerOrProvider);

        result._callChain = this._callChain;
        result._callChain.push(result.callMethod(name, ...params));

        return result;
    }

    /**
     * Executes the chainable list of contract calls
     *
     * @param provider
     */
    public async exec<Type extends any[] = any[]> (
        provider?: ethers.Signer | ethers.providers.Provider | MulticallProvider
    ): Promise<Type> {
        if (this._callChain.length === 0) {
            throw new Error('No call chain available');
        }

        provider = provider || this.multicallProvider;

        if (!provider || (!(provider instanceof MulticallProvider))) {
            provider = await MulticallProvider.create(this.provider);
        }

        return provider.aggregate<Type>(this._callChain);
    }

    /**
     * Construct a contract call that can be utilized as a multicall
     *
     * @param name
     * @param params
     */
    public callMethod (name: string, ...params: any[]): IContractCall {
        const method = this._callMethods.get(name);

        if (!method) {
            throw new Error('Contract method not callable');
        }

        return {
            contract: {
                address: method.contract.address
            },
            name: method.name,
            inputs: method.inputs,
            outputs: method.outputs,
            params: params
        };
    }
}
