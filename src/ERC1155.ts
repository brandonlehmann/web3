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
import BaseContract, { IContract } from './BaseContract';
import { MaxApproval } from './ERC20';
import { IContractCall } from './Contract';
import { NFTAssetType } from './Types';
import { detectAssetType } from './Tools';
import { IERC721Attribute } from './ERC721';
import StorageWrapper from './StorageWrapper';
import IPFSGatewayHelper from './IPFSGatewayHelper';

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
    name: string;
    decimals?: number;
    description: string;
    image?: string;
    properties?: IERC1155Properties;
    attributes?: IERC721Attribute[];
}

/**
 * Represents fetched metadata of an ERC1155 token
 */
export interface IERC1155FetchedMetadata extends IERC1155Metadata {
    tokenId: BigNumber;
    type: NFTAssetType;
    contract: string;
}

/**
 * Basic representation of an ERC1155 compatible contract.
 * If additional functionality is required, this contract can be
 * extended via inheritance
 */
export default class ERC1155 extends BaseContract {
    private _maximumID: BigNumber = BigNumber.from(0);

    /**
     * Constructs a new instance of the contract
     *
     * @param _contract
     * @param IPFSGateway
     * @param maximumId
     */
    constructor (
        _contract: IContract,
        IPFSGateway = 'https://cloudflare-ipfs.com/ipfs/',
        maximumId?: ethers.BigNumberish
    ) {
        super(_contract);

        IPFSGatewayHelper.registerGateway(IPFSGateway);

        if (maximumId) {
            this._maximumID = BigNumber.from(maximumId);
        } else {
            const value = StorageWrapper.get<string>(`${this.address}-maximumId`);

            if (value) {
                this._maximumID = BigNumber.from(value);
            }
        }
    }

    public get IPFSGateway (): string {
        return IPFSGatewayHelper.gateway;
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
     * Get the balance of multiple account/token pairs
     *
     * @param owners
     * @param ids
     */
    public async balanceOfBatch (owners: string[], ids: ethers.BigNumberish[]): Promise<ethers.BigNumberish[]> {
        return this.retryCall<BigNumber[]>(this.contract.balanceOfBatch, owners, ids);
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
            this._maximumID = await this.maximumID();

            StorageWrapper.set<string>(`${this.address}-maximumId`, this._maximumID.toString());

            return this._maximumID;
        } catch {
            if (this._maximumID.isZero()) {
                try {
                    await this.uri(0);
                } catch {
                    try {
                        await this.uri(1);

                        this._maximumID = BigNumber.from(1);
                    } catch {}
                }
            }

            for (let i = this._maximumID;
                i.lt(MaxApproval);
                i = i.add(1)) {
                try {
                    await this.uri(i);

                    this._maximumID = i;
                } catch {
                    break;
                }
            }

            StorageWrapper.set<string>(`${this.address}-maximumId`, this._maximumID.toString());

            return this._maximumID;
        }
    }

    /**
     * Indicates whether any token exist with a given id, or not.
     *
     * @param id
     */
    public async exists (id: ethers.BigNumberish): Promise<boolean> {
        if (typeof this.contract.exists === 'function') {
            return this.retryCall<boolean>(this.contract.exists, id);
        }

        try {
            await this.uri(id);

            return true;
        } catch {
            return false;
        }
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
    public async metadata (id: ethers.BigNumberish): Promise<IERC1155FetchedMetadata> {
        const uri = await this.uri(id);

        const json: IERC1155FetchedMetadata = await IPFSGatewayHelper.fetch<IERC1155FetchedMetadata>(uri);

        if (json.image) {
            json.image = json.image.replace('ipfs://', this.IPFSGateway);
        }

        json.tokenId = (id as BigNumber);
        json.contract = this.contract.address;

        return json;
    }

    /**
     * A descriptive name for a collection of NFTs in this contract
     */
    public async name (): Promise<string> {
        return this.retryCall<string>(this.contract.name);
    }

    /**
     * Returns the metadata for all NFTs owned by the specified account by
     * scanning through the range of IDs provided
     *
     * @param owner
     */
    public async ownedMetadata (
        owner: string
    ): Promise<IERC1155Metadata[]> {
        const tokenIds = await this.ownedTokenIds(owner);

        if (this.contract.multicallProvider) {
            const uriRequests: {id: ethers.BigNumberish, uri: string}[] = [];

            const calls: IContractCall[] = [];

            for (const tokenId of tokenIds) {
                calls.push(this.call('uri', tokenId));
            }

            const uris = await this.contract.multicallProvider.aggregate<string[]>(calls);

            for (let i = 0; i < tokenIds.length; i++) {
                uriRequests.push({
                    id: tokenIds[i],
                    uri: uris[i]
                });
            }

            return this.metadataBulk(uriRequests);
        } else {
            const promises = [];

            for (const tokenId of tokenIds) {
                promises.push(this.metadata(tokenId));
            }

            return (await Promise.all(promises))
                .filter(elem => elem !== undefined)
                .sort((a, b) =>
                    a.tokenId.toNumber() - b.tokenId.toNumber());
        }
    }

    /**
     * Returns an array of token IDs owned by the specified account by
     * scanning through the range of IDs provided
     *
     * @param owner
     */
    public async ownedTokenIds (
        owner: string
    ): Promise<BigNumber[]> {
        await this.discoverMaximumId();

        const results: BigNumber[] = [];

        const startId = (await this.exists(0)) ? BigNumber.from(0) : BigNumber.from(1);

        if (this.contract.multicallProvider) {
            const calls: IContractCall[] = [];

            for (let tokenId = BigNumber.from(startId);
                tokenId.lte(BigNumber.from(this._maximumID));
                tokenId = tokenId.add(1)) {
                calls.push(this.call('balanceOf', owner, tokenId));
            }

            const response = await this.contract.multicallProvider.aggregate<BigNumber[]>(calls);

            for (let i = 0; i < response.length; i++) {
                if (!response[i].isZero()) {
                    results.push(BigNumber.from(BigNumber.from(startId).add(i)));
                }
            }
        } else {
            for (let tokenId = BigNumber.from(startId);
                tokenId.lte(BigNumber.from(this._maximumID));
                tokenId = tokenId.add(1)) {
                if (!(await this.balanceOf(owner, tokenId)).isZero()) {
                    results.push(tokenId);
                }
            }
        }

        return results;
    }

    /**
     * Returns how much royalty is owed and to whom, based on a sale price that may be denominated in any unit of
     * exchange. The royalty amount is denominated and should be payed in that same unit of exchange.
     *
     * @param tokenId
     * @param salePrice
     */
    public async royaltyInfo (
        tokenId: ethers.BigNumberish,
        salePrice: ethers.BigNumberish
    ): Promise<{ receiver: string, royaltyAmount: BigNumber }> {
        const [receiver, royaltyAmount] = await this.retryCall<any[]>(
            this.contract.royaltyInfo,
            tokenId,
            salePrice
        );

        return {
            receiver,
            royaltyAmount
        };
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
     * A distinct Uniform Resource Identifier (URI) for a given asset.
     *
     * @param tokenId
     * @alias uri
     */
    public async tokenURI (tokenId: ethers.BigNumberish): Promise<string> {
        return this.uri(tokenId);
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
    public async uri (id: ethers.BigNumberish): Promise<string> {
        const uri = await this.retryCall<string>(this.contract.uri, id);

        return uri.replace('ipfs://', this.IPFSGateway);
    }

    /**
     * Retrieves bulk metadata
     *
     * @param tokens
     * @protected
     */
    protected async metadataBulk (
        tokens: { id: ethers.BigNumberish, uri: string }[]
    ): Promise<IERC1155FetchedMetadata[]> {
        const result: IERC1155FetchedMetadata[] = [];

        const promises = [];

        const get = async (token: {
            id: ethers.BigNumberish,
            uri: string
        }): Promise<{ id: ethers.BigNumberish, json: IERC1155FetchedMetadata }> => {
            return {
                id: token.id,
                json: await IPFSGatewayHelper.fetch<IERC1155FetchedMetadata>(token.uri)
            };
        };

        for (const token of tokens) {
            promises.push(get(token));
        }

        const results = await Promise.all(promises);

        for (const r of results) {
            const { json } = r;
            if (json.image) {
                json.image = json.image.replace('ipfs://', this.IPFSGateway);
            }
            json.type = detectAssetType(json.image);
            json.tokenId = (r.id as BigNumber);
            json.contract = this.contract.address;

            result.push(json);
        }

        return result.sort((a, b) =>
            a.tokenId.toNumber() - b.tokenId.toNumber());
    }
}
