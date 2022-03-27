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

import {BigNumber, ethers, IContractCall} from '@brandonlehmann/ethers-providers';
import fetch, {Response} from 'cross-fetch';
import BaseContract, {IContract} from './BaseContract';

export interface IERC721Attribute {
    trait_type: string;
    value: string | number;
    count?: number;
    average?: number;
    frequency?: string;
    score?: number;
}

export interface IERC721Metadata {
    tokenId: BigNumber;
    contract: string;
    name: string;
    description: string;
    image: string;
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

export default class ERC721 extends BaseContract {
    constructor(
        _contract: IContract,
        public IPFSGateway = 'https://cloudflare-ipfs.com/ipfs/'
    ) {
        super(_contract);
    }

    /**
     * Change or reaffirm the approved address for an NFT
     * @param approved
     * @param tokenId
     */
    public async approve(
        approved: string,
        tokenId: ethers.BigNumberish
    ): Promise<ethers.ContractTransaction> {
        return this.contract.approve(approved, tokenId);
    }

    /**
     * Count all NFTs assigned to an owner
     * @param owner
     */
    public async balanceOf(owner: string): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.balanceOf, owner);
    }

    /**
     * Get the approved address for a single NFT
     * @param tokenId
     */
    public async getApproved(tokenId: ethers.BigNumberish): Promise<string> {
        return this.retryCall<string>(this.contract.getApproved, tokenId);
    }

    /**
     * Query if an address is an authorized operator for another address
     * @param owner
     * @param operator
     */
    public async isApprovedForAll(owner: string, operator: string): Promise<boolean> {
        return this.retryCall<boolean>(this.contract.isApprovedForAll, owner, operator);
    }

    /**
     * A descriptive name for a collection of NFTs in this contract
     */
    public async name(): Promise<string> {
        return this.retryCall<string>(this.contract.name);
    }

    /**
     * Returns the metadata for all NFTs owned by the specified account
     * @param owner
     */
    public async ownedMetadata(owner: string): Promise<IERC721Metadata[]> {
        let tokenIds = await this.ownedTokenIds(owner);

        if (this.contract.multicallProvider) {
            const uriRequests: {id: ethers.BigNumberish, uri: string}[] = [];

            while (tokenIds.length !== 0) {
                const batch = tokenIds.slice(0, 10);
                tokenIds = tokenIds.slice(10);

                const calls: IContractCall[] = [];

                for (const idx of batch) {
                    calls.push(this.call('tokenURI', idx));
                }

                const result = await this.contract.multicallProvider.aggregate<string[]>(calls);

                for (let i = 0 ; i < batch.length; i++) {
                    uriRequests.push({
                        id: batch[i],
                        uri: result[i]
                    });
                }
            }

            return this.metadataBulk(uriRequests);
        } else {
            const promises = [];

            for (const tokenId of tokenIds) {
                promises.push(this.metadata(tokenId));
            }

            return (await Promise.all(promises))
                .filter(elem => elem !== undefined);
        }
    }

    /**
     * Returns an array of token IDs owned by the specified account
     * @param owner
     */
    public async ownedTokenIds(owner: string): Promise<BigNumber[]> {
        const count = (await this.balanceOf(owner)).toNumber();

        if (this.contract.multicallProvider) {
            const result: BigNumber[] = [];

            let indexes: number[] = [];
            for (let i = 0; i < count; i++) {
                indexes.push(i);
            }

            const promises = [];

            while (indexes.length !== 0) {
                const calls: IContractCall[] = [];
                const batch = indexes.slice(0, 10);
                indexes = indexes.slice(10);

                for (const idx of batch) {
                    calls.push(this.call('tokenOfOwnerByIndex', owner, idx));
                }

                promises.push(this.contract.multicallProvider.aggregate(calls));
            }

            (await Promise.all(promises))
                .map(outer => outer.map(inner => result.push(inner)));

            return result;
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
     * @param tokenId
     */
    public async ownerOf(tokenId: ethers.BigNumberish): Promise<string> {
        return this.retryCall<string>(this.contract.ownerOf, tokenId);
    }

    /**
     * Returns how much royalty is owed and to whom, based on a sale price that may be denominated in any unit of
     * exchange. The royalty amount is denominated and should be payed in that same unit of exchange.
     * @param tokenId
     * @param salePrice
     */
    public async royaltyInfo(
        tokenId: ethers.BigNumberish,
        salePrice: ethers.BigNumberish
    ): Promise<{receiver: string, royaltyAmount: BigNumber}> {
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
     * @param from
     * @param to
     * @param tokenId
     * @param data
     */
    public async safeTransferFrom(
        from: string,
        to: string,
        tokenId: ethers.BigNumberish,
        data?: string
    ): Promise<ethers.ContractTransaction> {
        if (data) {
            return this.contract['safeTransferFrom(address,address,uint256,bytes)'](from, to, tokenId, data);
        } else {
            return this.contract['safeTransferFrom(address,address,uint256)'](from, to, tokenId);
        }
    }

    /**
     * Enable or disable approval for a third party ("operator") to manage
     *         all of `msg.sender`'s assets
     * @param operator
     * @param approved
     */
    public async setApprovalForAll(
        operator: string,
        approved = true
    ): Promise<ethers.ContractTransaction> {
        return this.contract.setApprovalForAll(operator, approved);
    }

    /**
     * Fetches the metadata for the specified token ID
     * @param tokenId
     */
    public async metadata(tokenId: ethers.BigNumberish): Promise<IERC721Metadata> {
        const uri = await this.tokenURI(tokenId);

        const response = await fetch(uri);

        if (!response.ok) {
            throw new Error('Error fetching metadata JSON');
        }

        const json: IERC721Metadata = await response.json();

        json.image = json.image.replace('ipfs://', this.IPFSGateway);
        json.tokenId = (tokenId as BigNumber);
        json.contract = this.contract.address;

        return json;
    }

    /**
     * Retrieves bulk metadata
     *
     * @param tokens
     * @protected
     */
    protected async metadataBulk(tokens: {id: ethers.BigNumberish, uri: string}[]): Promise<IERC721Metadata[]> {
        const result: IERC721Metadata[] = [];

        const promises = [];

        const get = async(token: {
            id: ethers.BigNumberish,
            uri: string
        }): Promise<{id: ethers.BigNumberish, response: Response}> => {
            return {
                id: token.id,
                response: await fetch(token.uri)
            };
        };

        for (const token of tokens) {
            promises.push(get(token));
        }

        const results = await Promise.all(promises);

        for (const r of results) {
            if (!r.response.ok) {
                throw new Error('Error fetching metadata');
            }

            const json: IERC721Metadata = await r.response.json();
            json.image = json.image.replace('ipfs://', this.IPFSGateway);
            json.tokenId = (r.id as BigNumber);
            json.contract = this.contract.address;

            result.push(json);
        }

        return result;
    }

    /**
     * An abbreviated name for NFTs in this contract
     */
    public async symbol(): Promise<string> {
        return this.retryCall<string>(this.contract.symbol);
    }

    /**
     * Returns a token ID at a given `index` of all the tokens stored by the contract.
     * Use along with {totalSupply} to enumerate all tokens.
     * @param index
     */
    public async tokenByIndex(index: ethers.BigNumberish): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.tokenByIndex, index);
    }

    /**
     * Return the metadata of the token
     */
    public async tokenMetadata(): Promise<{
        address: string,
        symbol: string,
        name: string,
        totalSupply: BigNumber
    }> {
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
    }

    /**
     * Returns a token ID owned by `owner` at a given `index` of its token list.
     * Use along with {balanceOf} to enumerate all of ``owner``'s tokens.
     * @param owner
     * @param index
     */
    public async tokenOfOwnerByIndex(owner: string, index: ethers.BigNumberish): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.tokenOfOwnerByIndex, owner, index);
    }

    /**
     * A distinct Uniform Resource Identifier (URI) for a given asset.
     * @param tokenId
     */
    public async tokenURI(tokenId: ethers.BigNumberish): Promise<string> {
        const uri = await this.retryCall<string>(this.contract.tokenURI, tokenId);

        return uri.replace('ipfs://', this.IPFSGateway);
    }

    /**
     * Returns the total amount of tokens stored by the contract.
     */
    public async totalSupply(): Promise<BigNumber> {
        return this.retryCall<BigNumber>(this.contract.totalSupply);
    }

    /**
     * Transfer ownership of an NFT -- THE CALLER IS RESPONSIBLE
     *          TO CONFIRM THAT `_to` IS CAPABLE OF RECEIVING NFTS OR ELSE
     *          THEY MAY BE PERMANENTLY LOST
     * @param from
     * @param to
     * @param tokenId
     */
    public async transferFrom(
        from: string,
        to: string,
        tokenId: ethers.BigNumberish
    ): Promise<ethers.ContractTransaction> {
        return this.contract.transferFrom(from, to, tokenId);
    }
}
