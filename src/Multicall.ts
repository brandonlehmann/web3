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
import BaseContract from './BaseContract';

/**
 * Basic representation of a standard Multicall compatible contract.
 * If additional functionality is required, this contract can be
 * extended via inheritance
 */
export default class MultiCall extends BaseContract {
    /**
     * Executes the aggregated calls and returns the results
     *
     * @param calls
     */
    public async aggregate (
        calls: string[] | ethers.BytesLike[]
    ): Promise<{ blockNumber: BigNumber, returnData: string[] }> {
        const [blockNumber, returnData] = await this.retryCall(this.contract.aggregate, calls);

        return {
            blockNumber,
            returnData
        };
    }

    /**
     * Retrieves the balance of the specified account
     *
     * @param address
     */
    public async getEthBalance (address: string): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.getEthBalance, address);
    }

    /**
     * Retrieves the hash of the specified block height
     *
     * @param blockNumber
     */
    public async getBlockHash (blockNumber: ethers.BigNumberish): Promise<string> {
        return this.retryCall<string>(this.contract.getBlockHash, blockNumber);
    }

    /**
     * Retrieves the last block hash
     */
    public async getLastBlockHash (): Promise<string> {
        return this.retryCall<string>(this.contract.getLastBlockHash);
    }

    /**
     * Retrieves the current block timestamp
     */
    public async getCurrentBlockTimestamp (): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.getCurrentBlockTimestamp);
    }

    /**
     * Retrieves the current block difficulty
     */
    public async getCurrentBlockDifficulty (): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.getCurrentBlockDifficulty);
    }

    /**
     * Retrieves the current block gas limit
     */
    public async getCurrentBlockGasLimit (): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.getCurrentBlockGasLimit);
    }

    /**
     * Retrieves the current block's coinbase address
     */
    public async getCurrentBlockCoinbase (): Promise<string> {
        return this.retryCall<string>(this.contract.getCurrentBlockCoinbase);
    }
}
