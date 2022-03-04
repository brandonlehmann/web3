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

import ERC20, {MaxApproval} from './ERC20';
import ERC721, {IERC721Metadata, IERC721Attribute} from './ERC721';
import ERC1155, {IERC1155Metadata, IERC1155Properties} from './ERC1155';
import MultiCall from './Multicall';
import BaseContract from './BaseContract';
import Web3Controller, {DefaultProviderOptions, IProviderOptions, NullAddress} from './Web3Controller';
import {ethers, BigNumber, Contract, Multicall} from '@brandonlehmann/ethers-providers';
import Metronome from 'node-metronome';
import numeral from 'numeral';
import {sleep} from './Tools';
import fetch, {Headers, Request, Response} from 'cross-fetch';

export {
    fetch,
    Headers,
    Request,
    Response,
    ERC20,
    ERC721,
    BaseContract,
    MaxApproval,
    NullAddress,
    Contract,
    Multicall,
    IERC721Metadata,
    IERC721Attribute,
    ERC1155,
    IERC1155Metadata,
    IERC1155Properties,
    Web3Controller,
    MultiCall,
    DefaultProviderOptions,
    IProviderOptions,
    ethers,
    BigNumber,
    Metronome,
    numeral,
    sleep
};

export default Web3Controller;
