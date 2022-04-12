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
import { IContractCall } from './Contract';
import BaseContract from './BaseContract';

/**
 * type(uint256).max representation for maximum token approvals
 */
export const MaxApproval = BigNumber.from(
    '115792089237316195423570985008687907853269984665640564039453994996602238659104');

/**
 * Basic representation of an ERC20 compatible contract.
 * If additional functionality is required, this contract can be
 * extended via inheritance
 */
export default class ERC20 extends BaseContract {
    /**
     * Returns the amount which spender is still allowed to withdraw from owner.
     *
     * @param owner
     * @param spender
     */
    public async allowance (owner: string, spender: string): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.allowance, owner, spender);
    }

    /**
     * Allows spender to withdraw from your account multiple times, up to the value amount
     *
     * @param spender
     * @param value
     */
    public async approve (
        spender: string,
        value: ethers.BigNumberish = MaxApproval
    ): Promise<ethers.ContractTransaction> {
        return this.contract.approve(spender, value);
    }

    /**
     * Returns the account balance of another account with address owner.
     *
     * @param owner
     */
    public async balanceOf (owner: string): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.balanceOf, owner);
    }

    /**
     * Returns the balances for each of the provided accounts
     *
     * @param owners
     */
    public async balanceOfBatch (owners: string[]): Promise<{ owner: string, balance: BigNumber }[]> {
        if (this.contract.multicallProvider) {
            const results: { owner: string, balance: BigNumber }[] = [];

            const calls: IContractCall[] = [];

            for (const owner of owners) {
                calls.push(this.call('balanceOf', owner));
            }

            const balances = await this.contract.multicallProvider.aggregate<BigNumber[]>(calls);

            for (let i = 0; i < owners.length; i++) {
                results.push({
                    owner: owners[i],
                    balance: balances[i]
                });
            }

            return results;
        } else {
            const promises = [];

            const get = async (owner: string): Promise<{ owner: string, balance: BigNumber }> => {
                return {
                    owner: owner,
                    balance: await this.balanceOf(owner)
                };
            };

            for (const owner of owners) {
                promises.push(get(owner));
            }

            return Promise.all(promises);
        }
    }

    /**
     * Returns the number of decimals the token uses - e.g. 8, means to divide the
     * token amount by 100000000 to get its user representation.
     */
    public async decimals (): Promise<number> {
        return this.retryCall<number>(this.contract.decimals);
    }

    /**
     * Return the metadata of the token
     */
    public async tokenMetadata (): Promise<{
        address: string,
        symbol: string,
        name: string,
        decimals: number,
        totalSupply: BigNumber
    }> {
        if (this.contract.multicallProvider) {
            const result = await this.contract.call('symbol')
                .call('name')
                .call('decimals')
                .call('totalSupply')
                .exec();

            return {
                address: this.contract.address,
                symbol: result[0],
                name: result[1],
                decimals: result[2],
                totalSupply: result[3]
            };
        } else {
            return {
                address: this.address,
                symbol: await this.symbol(),
                name: await this.name(),
                decimals: await this.decimals(),
                totalSupply: await this.totalSupply()
            };
        }
    }

    /**
     * Returns the name of the token - e.g. "MyToken".
     */
    public async name (): Promise<string> {
        return this.retryCall<string>(this.contract.name);
    }

    /**
     * Returns the symbol of the token. E.g. “HIX”.
     */
    public async symbol (): Promise<string> {
        return this.retryCall<string>(this.contract.symbol);
    }

    /**
     * Returns the total token supply
     */
    public async totalSupply (): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.totalSupply);
    }

    /**
     * Transfers value amount of tokens to address to
     *
     * @param to
     * @param value
     */
    public async transfer (to: string, value: ethers.BigNumberish): Promise<ethers.ContractTransaction> {
        return this.contract.transfer(to, value);
    }

    /**
     * Transfers value amount of tokens from address from to address to
     *
     * @param from
     * @param to
     * @param value
     */
    public async transferFrom (
        from: string,
        to: string,
        value: ethers.BigNumberish
    ): Promise<ethers.ContractTransaction> {
        return this.contract.transferFrom(from, to, value);
    }
}
