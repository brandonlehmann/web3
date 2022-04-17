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
import fetch from 'cross-fetch';
import BaseContract, { IContract } from './BaseContract';
import { MaxApproval } from './ERC20';
import { IContractCall } from './Contract';

/**
 * Represents an ERC1155 attribute in the metadata
 */
export interface IERC1155Properties {
    [key: string]: string | number | object;
}

/**
 * Represents the metadata of an ERC1155 token
 */
export interface IERC1155Metadata {
    tokenId: BigNumber
    contract: string;
    name: string;
    decimals?: number;
    description: string;
    image?: string;
    properties?: IERC1155Properties;
}

/**
 * Basic representation of an ERC1155 compatible contract.
 * If additional functionality is required, this contract can be
 * extended via inheritance
 */
export default class ERC1155 extends BaseContract {
    private _maximumID: BigNumber = BigNumber.from(0);

    constructor (
        _contract: IContract,
        public IPFSGateway = 'https://cloudflare-ipfs.com/ipfs/'
    ) {
        super(_contract);
    }

    /**
     * Get the balance of an account's tokens.
     *
     * @param owner
     * @param id
     */
    public async balanceOf (owner: string, id: ethers.BigNumberish): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.balanceOf, owner, id);
    }

    /**
     * Attempts to determine the balance of the owner across all IDs
     *
     * @param owner
     */
    public async balanceOfOwner (owner: string): Promise<BigNumber> {
        const maxId = await this.discoverMaximumId();

        if (this.contract.multicallProvider) {
            const calls: IContractCall[] = [];

            for (let i = BigNumber.from(1); i.lt(maxId); i = i.add(1)) {
                calls.push(this.call('balanceOf', owner, i));
            }

            const balances = await this.contract.multicallProvider.aggregate<BigNumber[]>(calls);

            let result = BigNumber.from(0);

            for (const balance of balances) {
                result = result.add(balance);
            }

            return result;
        } else {
            const promises = [];

            for (let i = BigNumber.from(1); i.lt(maxId); i = i.add(1)) {
                promises.push(this.balanceOf(owner, i));
            }

            const balances = await Promise.all(promises);

            let result = BigNumber.from(0);

            for (const balance of balances) {
                result = result.add(balance);
            }

            return result;
        }
    }

    /**
     * Get the balance of multiple account/token pairs
     *
     * @param owners
     * @param ids
     */
    public async balanceOfBatch (owners: string[], ids: ethers.BigNumberish[]): Promise<ethers.BigNumberish[]> {
        return this.retryCall<BigNumber[]>(this.contract.balanceOfBatch, owners, ids);
    }

    /**
     * Attempt to discover the maximum ID through brute forcing.
     *
     * Note: This method is *very* slow upon first run if maximumID() is not supported and the results
     * are cached internally to make subsequent calls faster; however, subsequent calls will check to
     * see if the maximum id has increased.
     *
     * Note: We loop in here until we get a revert... thus we cannot reasonably account for any burn
     * mechanics if the URI for a burned ID is destroyed by the contract
     */
    public async discoverMaximumId (): Promise<BigNumber> {
        try {
            return this.maximumID();
        } catch {
            for (let i = (this._maximumID.isZero() ? BigNumber.from(1) : this._maximumID);
                i.lt(MaxApproval);
                i = i.add(1)) {
                try {
                    await this.uri(i);

                    this._maximumID = i;
                } catch {
                    break;
                }
            }

            return this._maximumID;
        }
    }

    /**
     * Indicates whether any token exist with a given id, or not.
     *
     * @param id
     */
    public async exists (id: ethers.BigNumberish): Promise<boolean> {
        return this.retryCall<boolean>(this.contract.exists, id);
    }

    /**
     * Queries the approval status of an operator for a given owner.
     *
     * @param owner
     * @param operator
     */
    public async isApprovedForAll (owner: string, operator: string): Promise<boolean> {
        return this.retryCall<boolean>(this.contract.isApprovedForAll, owner, operator);
    }

    /**
     * Retrieves the maximum ID if the contract supports this call
     */
    public async maximumID (): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.maximumID);
    }

    /**
     * Fetches the metadata for the specified token ID
     *
     * @param id
     */
    public async metadata (id: ethers.BigNumberish): Promise<IERC1155Metadata> {
        const uri = await this.uri(id);

        const response = await fetch(uri);

        if (!response.ok) {
            throw new Error('Error fetching metadata JSON');
        }

        const json: IERC1155Metadata = await response.json();

        if (json.image) {
            json.image = json.image.replace('ipfs://', this.IPFSGateway);
        }

        json.tokenId = (id as BigNumber);
        json.contract = this.contract.address;

        return json;
    }

    /**
     * Transfers `values` amount(s) of `ids` from the `from` address to the `to` address specified (with safety call).
     *
     * @param from
     * @param to
     * @param ids
     * @param values
     * @param data
     */
    public async safeBatchTransferFrom (
        from: string,
        to: string,
        ids: ethers.BigNumberish[],
        values: ethers.BigNumberish[],
        data: string
    ): Promise<ethers.ContractTransaction> {
        return this.contract.safeBatchTransferFrom(from, to, ids, values, data);
    }

    /**
     * Transfers `value` amount of an `id` from the `from` address to the `to` address specified (with safety call).
     *
     * @param from
     * @param to
     * @param id
     * @param value
     * @param data
     */
    public async safeTransferFrom (
        from: string,
        to: string,
        id: ethers.BigNumberish,
        value: ethers.BigNumberish,
        data: string
    ): Promise<ethers.ContractTransaction> {
        return this.contract.safeTransferFrom(from, to, id, value, data);
    }

    /**
     * Enable or disable approval for a third party ("operator") to manage all of the caller's tokens.
     *
     * @param operator
     * @param approved
     */
    public async setApprovalForAll (operator: string, approved = true): Promise<ethers.ContractTransaction> {
        return this.contract.setApprovalForAll(operator, approved);
    }

    /**
     * Returns the total amount of tokens stored by the contract.
     */
    public async totalSupply (id: ethers.BigNumberish): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.totalSupply, id);
    }

    /**
     * A distinct Uniform Resource Identifier (URI) for a given token.
     *
     * @param id
     */
    public async uri (id: ethers.BigNumberish): Promise<any> {
        const uri = await this.retryCall<string>(this.contract.uri, id);

        return uri.replace('ipfs://', this.IPFSGateway);
    }
}
