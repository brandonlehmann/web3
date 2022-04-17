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

import ABI from './ABI';
import BaseContract from './BaseContract';
import Contract from './Contract';
import ERC20, { MaxApproval } from './ERC20';
import ERC721 from './ERC721';
import ERC777 from './ERC777';
import ERC1155 from './ERC1155';
import MultiCall from './Multicall';
import Verifier from './Verifier';
import { multicallAbi, multicallAddresses } from './MulticallAddresses';
import MulticallProvider from './MulticallProvider';
import { sleep } from './Tools';
import Web3Controller from './Web3Controller';
import { DefaultProviderOptions, Null1Address, NullAddress } from './Types';
import { BigNumber, ethers } from 'ethers';
import Metronome from 'node-metronome';
import numeral from 'numeral';
import fetch, { Headers, Request, Response } from 'cross-fetch';
import * as localStorage from 'local-storage';
import * as dotenv from 'dotenv';

export default {
    ABI,
    fetch,
    Headers,
    Request,
    Response,
    ERC20,
    ERC721,
    ERC777,
    BaseContract,
    MaxApproval,
    NullAddress,
    Null1Address,
    Contract,
    MultiCall,
    MulticallProvider,
    multicallAddresses,
    multicallAbi,
    ERC1155,
    Web3Controller,
    DefaultProviderOptions,
    ethers,
    BigNumber,
    Metronome,
    numeral,
    sleep,
    localStorage,
    Verifier,
    dotenv
};
