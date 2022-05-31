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

export default class PaymentSplitter extends BaseContract {
    /**
     * Adds another payee to the `PaymentSplitter` with the specified number of `shares`
     * for the `payee`
     *
     * Note: `payee` must be non-zero
     *
     * @param payee
     * @param shares
     * @param overrides
     */
    public async addPayee (
        payee: string,
        shares: ethers.BigNumberish,
        overrides: ethers.CallOverrides = {}
    ): Promise<ethers.ContractTransaction> {
        return this.contract.addPayee(payee, shares, overrides);
    }

    /**
     * Returns the number of payees in the PaymentSplitter
     */
    public async count (): Promise<BigNumber> {
        return this.retryCall(this.contract.count);
    }

    /**
     * Initializes the instance of `PaymentSplitter` where each account in `payees` is assigned the number of shares at
     * the matching position in the `shares` array.
     *
     * All addresses in `payees` must be non-zero. Both arrays must have the same non-zero length.
     *
     * @param payees
     * @param shares
     * @param overrides
     */
    public async initialize (
        payees?: string[],
        shares?: ethers.BigNumberish[],
        overrides: ethers.CallOverrides = {}
    ): Promise<ethers.ContractTransaction> {
        if (payees?.length !== shares?.length) {
            throw new Error('Payees and shares arrays must be of equal size');
        }

        if (payees && shares) {
            return this.contract['initialize(address[],uint256[]'](payees, shares, overrides);
        }

        return this.contract['initialize()'](overrides);
    }

    /**
     * Getter for the address of the payee number `index`.
     *
     * @param index
     */
    public async payee (index: ethers.BigNumberish): Promise<string> {
        return this.retryCall(this.contract.payee, index);
    }

    /**
     * Returns a list of the payees and their number of shares in the PaymentSplitter
     */
    public async payees (): Promise<{account: string, shares: BigNumber}[]> {
        return this.retryCall<{account: string, shares: BigNumber}[]>(this.contract.payees);
    }

    /**
     * Returns amount currently pending distribution for the specified account
     *
     * @param account
     * @param token
     */
    public async pending (account: string, token?: string): Promise<BigNumber> {
        if (!token) {
            return this.retryCall(this.contract['pending(address)'], account);
        }

        return this.retryCall(this.contract['pending(address,address)'], token, account);
    }

    /**
     * Triggers a transfer to `account` of the amount of Ether (or {token}) they are owed, according to their
     * percentage of the total shares and their previous withdrawals.
     *
     * @param account
     * @param token
     * @param overrides
     */
    public async release (
        account: string,
        token?: string,
        overrides: ethers.CallOverrides = {}
    ): Promise<ethers.ContractTransaction> {
        if (!token) {
            return this.contract['release(address)'](account, overrides);
        }

        return this.contract['release(address,address)'](token, account, overrides);
    }

    /**
     * Releases all funds due to all accounts in the PaymentSplitter
     *
     * @param token
     * @param overrides
     */
    public async releaseAll (
        token?: string,
        overrides: ethers.CallOverrides = {}
    ): Promise<ethers.ContractTransaction> {
        if (!token) {
            return this.contract['releaseAll()'](overrides);
        }

        return this.contract['releaseAll(token)'](token, overrides);
    }

    /**
     * Getter for the amount of Ether (or {token}) already released to a payee.
     *
     * @param account
     * @param token
     */
    public async released (account: string, token?: string): Promise<BigNumber> {
        if (!token) {
            return this.retryCall(this.contract['released(address)'], account);
        }

        return this.retryCall(this.contract['released(address,address)'], token, account);
    }

    /**
     * Getter for the amount of shares held by an account.
     *
     * @param account
     */
    public async shares (account: string): Promise<BigNumber> {
        return this.retryCall(this.contract.shares, account);
    }

    /**
     * Getter for the total shares held by payees.
     */
    public async totalShares (): Promise<BigNumber> {
        return this.retryCall(this.contract.totalShares);
    }

    /**
     * Getter for the total amount of Ether (or {token}) already released.
     *
     * @param token
     */
    public async totalReleased (token?: string): Promise<BigNumber> {
        if (!token) {
            return this.retryCall(this.contract['totalReleased()']);
        }

        return this.retryCall(this.contract['totalReleased(address)'], token);
    }

    /**
     * Getter for the version of the PaymentSplitter contract
     */
    public async VERSION (): Promise<BigNumber> {
        return this.retryCall(this.contract.VERSION);
    }
}
