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
import BaseContract, { IContract } from './BaseContract';
import { NFTAssetType } from './Types';
import { detectAssetType } from './Tools';
import IPFSGatewayHelper from './IPFSGatewayHelper';

/**
 * Represents an ERC721 attribute in the metadata
 */
export interface IERC721Attribute {
    display_type?: string;
    trait_type: string;
    value: string | number;
    count?: number;
    average?: number;
    frequency?: string;
    score?: number;
}

/**
 * Represents the metadata of an ERC721 token
 */
export interface IERC721Metadata {
    name: string;
    description: string;
    image: string;
    image_data?: string;
    external_url?: string;
    background_color?: string;
    animation_url?: string;
    youtube_url?: string;
    dna?: string;
    edition?: number;
    date?: number;
    attributes: IERC721Attribute[]
    rarity?: {
        total?: number;
        score?: number;
        rank?: number;
        harmonic?: {
            score: string;
            rank: number;
        }
    }
}

/**
 * Represents the fetched metadata of an ERC721 token
 */
export interface IERC721FetchedMetadata extends IERC721Metadata {
    tokenId: BigNumber;
    type: NFTAssetType,
    contract: string;
}

/**
 * Basic representation of an ERC721 compatible contract.
 * If additional functionality is required, this contract can be
 * extended via inheritance
 */
export default class ERC721 extends BaseContract {
    /**
     * Creates a new instance of the object
     *
     * @param _contract
     * @param IPFSGateway
     */
    constructor (
        _contract: IContract,
        IPFSGateway = 'https://cloudflare-ipfs.com/ipfs/'
    ) {
        super(_contract);

        IPFSGatewayHelper.registerGateway(IPFSGateway);
    }

    public get IPFSGateway (): string {
        return IPFSGatewayHelper.gateway;
    }

    /**
     * Change or reaffirm the approved address for an NFT
     *
     * @param approved
     * @param tokenId
     * @param overrides
     */
    public async approve (
        approved: string,
        tokenId: ethers.BigNumberish,
        overrides: ethers.CallOverrides = {}
    ): Promise<ethers.ContractTransaction> {
        return this.contract.approve(approved, tokenId, overrides);
    }

    /**
     * Count all NFTs assigned to an owner
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
     * Get the approved address for a single NFT
     *
     * @param tokenId
     */
    public async getApproved (tokenId: ethers.BigNumberish): Promise<string> {
        return this.retryCall<string>(this.contract.getApproved, tokenId);
    }

    /**
     * Query if an address is an authorized operator for another address
     *
     * @param owner
     * @param operator
     */
    public async isApprovedForAll (owner: string, operator: string): Promise<boolean> {
        return this.retryCall<boolean>(this.contract.isApprovedForAll, owner, operator);
    }

    /**
     * Fetches the metadata for the specified token ID
     *
     * @param tokenId
     */
    public async metadata (tokenId: ethers.BigNumberish): Promise<IERC721FetchedMetadata> {
        const uri = await this.tokenURI(tokenId);

        const json: IERC721FetchedMetadata = await IPFSGatewayHelper.fetch<IERC721FetchedMetadata>(uri);

        json.image = json.image.replace('ipfs://', this.IPFSGateway);
        json.tokenId = (tokenId as BigNumber);
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
     * Returns the metadata for all NFTs owned by the specified account
     *
     * @param owner
     */
    public async ownedMetadata (owner: string): Promise<IERC721FetchedMetadata[]> {
        const tokenIds = await this.ownedTokenIds(owner);

        if (this.contract.multicallProvider) {
            const uriRequests: { id: ethers.BigNumberish, uri: string }[] = [];

            const calls: IContractCall[] = [];

            for (const tokenId of tokenIds) {
                calls.push(this.call('tokenURI', tokenId));
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
     * Returns an array of token IDs owned by the specified account
     *
     * @param owner
     */
    public async ownedTokenIds (owner: string): Promise<BigNumber[]> {
        const count = (await this.balanceOf(owner)).toNumber();

        if (this.contract.multicallProvider) {
            const calls: IContractCall[] = [];

            for (let i = 0; i < count; i++) {
                calls.push(this.call('tokenOfOwnerByIndex', owner, i));
            }

            return this.contract.multicallProvider.aggregate<BigNumber[]>(calls);
        } else {
            const promises = [];

            for (let i = 0; i < count; i++) {
                promises.push(this.tokenOfOwnerByIndex(owner, i));
            }

            return Promise.all(promises);
        }
    }

    /**
     * Find the owner of an NFT
     *
     * @param tokenId
     */
    public async ownerOf (tokenId: ethers.BigNumberish): Promise<string> {
        return this.retryCall<string>(this.contract.ownerOf, tokenId);
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
     * Transfers the ownership of an NFT from one address to another address
     *
     * @param from
     * @param to
     * @param tokenId
     * @param data
     * @param overrides
     */
    public async safeTransferFrom (
        from: string,
        to: string,
        tokenId: ethers.BigNumberish,
        data?: string,
        overrides: ethers.CallOverrides = {}
    ): Promise<ethers.ContractTransaction> {
        if (data) {
            return this.contract['safeTransferFrom(address,address,uint256,bytes)'](from, to, tokenId, data, overrides);
        } else {
            return this.contract['safeTransferFrom(address,address,uint256)'](from, to, tokenId, overrides);
        }
    }

    /**
     * Enable or disable approval for a third party ("operator") to manage
     *         all of `msg.sender`'s assets
     *
     * @param operator
     * @param approved
     * @param overrides
     */
    public async setApprovalForAll (
        operator: string,
        approved = true,
        overrides: ethers.CallOverrides = {}
    ): Promise<ethers.ContractTransaction> {
        return this.contract.setApprovalForAll(operator, approved, overrides);
    }

    /**
     * An abbreviated name for NFTs in this contract
     */
    public async symbol (): Promise<string> {
        return this.retryCall<string>(this.contract.symbol);
    }

    /**
     * Returns a token ID at a given `index` of all the tokens stored by the contract.
     * Use along with {totalSupply} to enumerate all tokens.
     *
     * @param index
     */
    public async tokenByIndex (index: ethers.BigNumberish): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.tokenByIndex, index);
    }

    /**
     * Return the metadata of the token
     */
    public async tokenMetadata (): Promise<{
        address: string,
        symbol: string,
        name: string,
        totalSupply: BigNumber
    }> {
        if (this.contract.multicallProvider) {
            const result = await this.contract.call('symbol')
                .call('name')
                .call('totalSupply')
                .exec();

            return {
                address: this.contract.address,
                symbol: result[0],
                name: result[1],
                totalSupply: result[2]
            };
        } else {
            return {
                address: this.contract.address,
                symbol: await this.symbol(),
                name: await this.name(),
                totalSupply: await this.totalSupply()
            };
        }
    }

    /**
     * Returns a token ID owned by `owner` at a given `index` of its token list.
     * Use along with {balanceOf} to enumerate all of ``owner``'s tokens.
     *
     * @param owner
     * @param index
     */
    public async tokenOfOwnerByIndex (owner: string, index: ethers.BigNumberish): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.tokenOfOwnerByIndex, owner, index);
    }

    /**
     * A distinct Uniform Resource Identifier (URI) for a given asset.
     *
     * @param tokenId
     */
    public async tokenURI (tokenId: ethers.BigNumberish): Promise<string> {
        const uri = await this.retryCall<string>(this.contract.tokenURI, tokenId);

        return uri.replace('ipfs://', this.IPFSGateway);
    }

    /**
     * Returns the total amount of tokens stored by the contract.
     */
    public async totalSupply (): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.totalSupply);
    }

    /**
     * Transfer ownership of an NFT -- THE CALLER IS RESPONSIBLE
     *          TO CONFIRM THAT `_to` IS CAPABLE OF RECEIVING NFTS OR ELSE
     *          THEY MAY BE PERMANENTLY LOST
     *
     * @param from
     * @param to
     * @param tokenId
     * @param overrides
     */
    public async transferFrom (
        from: string,
        to: string,
        tokenId: ethers.BigNumberish,
        overrides: ethers.CallOverrides = {}
    ): Promise<ethers.ContractTransaction> {
        return this.contract.transferFrom(from, to, tokenId, overrides);
    }

    /**
     * Retrieves bulk metadata
     *
     * @param tokens
     * @protected
     */
    protected async metadataBulk (
        tokens: { id: ethers.BigNumberish, uri: string }[]
    ): Promise<IERC721FetchedMetadata[]> {
        const result: IERC721FetchedMetadata[] = [];

        const promises = [];

        const get = async (token: {
            id: ethers.BigNumberish,
            uri: string
        }): Promise<{ id: ethers.BigNumberish, json: IERC721FetchedMetadata }> => {
            return {
                id: token.id,
                json: await IPFSGatewayHelper.fetch<IERC721FetchedMetadata>(token.uri)
            };
        };

        for (const token of tokens) {
            promises.push(get(token));
        }

        const results = await Promise.all(promises);

        for (const r of results) {
            const { json } = r;
            json.type = detectAssetType(json.image);
            json.image = json.image.replace('ipfs://', this.IPFSGateway);
            json.tokenId = (r.id as BigNumber);
            json.contract = this.contract.address;

            result.push(json);
        }

        return result.sort((a, b) =>
            a.tokenId.toNumber() - b.tokenId.toNumber());
    }
}
