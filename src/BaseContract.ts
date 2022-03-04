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

import {Contract, ethers, IContractCall, Multicall} from '@brandonlehmann/ethers-providers';
import {sleep} from './Tools';

export type IContract = ethers.Contract | Contract;

export default class BaseContract {
    private _contract: Contract;

    public get contract(): Contract {
        return this._contract;
    }

    constructor(_contract: IContract) {
        if (!(_contract instanceof Contract)) {
            this._contract = new Contract(_contract.address, _contract.interface, _contract.provider);
        } else {
            this._contract = _contract;
        }
    }

    /**
     * Automatically keeps trying the call unless we get a revert exception
     *
     * @param func
     * @param params
     * @protected
     */
    protected async retryCall<T>(func: (...args: any[]) => Promise<T>, ...params: any[]): Promise<T> {
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
     * Returns an interface allowing for us with the multicall method of a provider
     */
    public call(name: string, ...params: any[]): IContractCall {
        return this.contract.callMethod(name, ...params);
    }

    /**
     * Connects the existing instance of the contract to a new signer or provider
     *
     * @param signerOrProvider
     */
    public connect(signerOrProvider: ethers.Signer | ethers.providers.Provider | Multicall) {
        this._contract = new Contract(this._contract.address, this._contract.interface, signerOrProvider);
    }
}
