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
import { MaxApproval } from './ERC20';

export default class ERC777 extends BaseContract {
    /**
     * Returns the amount which spender is still allowed to withdraw from owner.
     * @param owner
     * @param spender
     */
    public async allowance (owner: string, spender: string): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.allowance, owner, spender);
    }

    /**
     * Allows spender to withdraw from your account multiple times, up to the value amount
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
     * Set a third party operator address as an operator of msg.sender to send and burn tokens on its behalf.
     *
     * @param operator
     */
    public async authorizeOperator (operator: string): Promise<ethers.ContractTransaction> {
        return this.contract.authorizeOperator(operator);
    }

    /**
     * Returns the account balance of another account with address owner.
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
    public async balanceOfBatch (owners: string[]): Promise<{owner: string, balance: BigNumber}[]> {
        if (this.contract.multicallProvider) {
            const results: {owner: string, balance: BigNumber}[] = [];

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

            const get = async (owner: string): Promise<{owner: string, balance: BigNumber}> => {
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
     * Burn the amount of tokens from the address msg.sender.
     *
     * @param amount
     * @param data
     */
    public async burn (amount: ethers.BigNumberish, data: string): Promise<ethers.ContractTransaction> {
        return this.contract.burn(amount, data);
    }

    /**
     * Returns the number of decimals the token uses - e.g. 8, means to divide the
     * token amount by 100000000 to get its user representation.
     */
    public async decimals (): Promise<number> {
        return this.retryCall<number>(this.contract.decimals);
    }

    /**
     * Get the list of default operators as defined by the token contract.
     */
    public async defaultOperators (): Promise<string[]> {
        return this.retryCall<string[]>(this.contract.defaultOperators);
    }

    /**
     * Get the smallest part of the token that’s not divisible.
     *
     * In other words, the granularity is the smallest amount of tokens (in the internal denomination)
     * which MAY be minted, sent or burned at any time.
     */
    public async granularity (): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.granularity);
    }

    /**
     * Indicate whether the operator address is an operator of the holder address.
     *
     * @param operator
     * @param holder
     */
    public async isOperatorFor (operator: string, holder: string): Promise<boolean> {
        return this.retryCall<boolean>(this.contract.isOperatorFor, operator, holder);
    }

    /**
     * Returns the name of the token - e.g. "MyToken".
     */
    public async name (): Promise<string> {
        return this.retryCall<string>(this.contract.name);
    }

    /**
     * Burn the amount of tokens on behalf of the address from.
     *
     * @param from
     * @param amount
     * @param data
     * @param operatorData
     */
    public async operatorBurn (
        from: string,
        amount: ethers.BigNumberish,
        data: string,
        operatorData: string): Promise<ethers.ContractTransaction> {
        return this.contract.operatorBurn(from, amount, data, operatorData);
    }

    /**
     * Send the amount of tokens on behalf of the address from to the address to.
     *
     * Reminder: If the operator address is not an authorized operator of the from address,
     * then the send process MUST revert.
     *
     * @param from
     * @param to
     * @param amount
     * @param data
     * @param operatorData
     */
    public async operatorSend (
        from: string,
        to: string,
        amount: ethers.BigNumberish,
        data: string,
        operatorData: string
    ): Promise<ethers.ContractTransaction> {
        return this.contract.operatorSend(from, to, amount, data, operatorData);
    }

    /**
     * Remove the right of the operator address to be an operator for msg.sender
     * and to send and burn tokens on its behalf.
     *
     * @param operator
     */
    public async revokeOperator (operator: string): Promise<ethers.ContractTransaction> {
        return this.contract.revokeOperator(operator);
    }

    /**
     * Send the amount of tokens from the address msg.sender to the address to.
     *
     * @param to
     * @param amount
     * @param data
     */
    public async send (to: string, amount: ethers.BigNumberish, data: string): Promise<ethers.ContractTransaction> {
        return this.contract.send(to, amount, data);
    }

    /**
     * Returns the symbol of the token. E.g. “HIX”.
     */
    public async symbol (): Promise<string> {
        return this.retryCall<string>(this.contract.symbol);
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
     * Returns the total token supply
     */
    public async totalSupply (): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.totalSupply);
    }

    /**
     * Transfers value amount of tokens to address to
     * @param to
     * @param value
     */
    public async transfer (to: string, value: ethers.BigNumberish): Promise<ethers.ContractTransaction> {
        return this.contract.transfer(to, value);
    }

    /**
     * Transfers value amount of tokens from address from to address to
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
