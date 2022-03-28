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

const multicallAddresses: Map<number, string> = new Map<number, string>();

{
    interface IAddresses {
        [key: number]: string;
    }

    const addresses: IAddresses = {
        1: '0xeefba1e63905ef1d7acba5a8513c70307c1ce441',
        3: '0xF24b01476a55d635118ca848fbc7Dab69d403be3',
        4: '0x42ad527de7d4e9d9d011ac45b31d8551f8fe9821',
        5: '0x77dca2c955b15e9de4dbbcf1246b4b85b651e50e',
        42: '0x2cc8688c5f75e365aaeeb4ea8d6a480405a48d2a',
        56: '0x1Ee38d535d541c55C9dae27B12edf090C608E6Fb',
        66: '0x94fEadE0D3D832E4A05d459eBeA9350c6cDd3bCa',
        97: '0x3A09ad1B8535F25b48e6Fa0CFd07dB6B017b31B2',
        100: '0xb5b692a88bdfc81ca69dcb1d924f59f0413a602a',
        128: '0x2C55D51804CF5b436BA5AF37bD7b8E5DB70EBf29',
        137: '0x11ce4B23bD875D7F5C6a31084f55fDe1e9A87507',
        250: '0x0118EF741097D0d3cc88e46233Da1e407d9ac139',
        1337: '0x77dca2c955b15e9de4dbbcf1246b4b85b651e50e',
        42161: '0x813715eF627B01f4931d8C6F8D2459F26E19137E',
        43114: '0x7f3aC7C283d7E6662D886F494f7bc6F1993cDacf',
        80001: '0x08411ADd0b5AA8ee47563b146743C13b3556c9Cc'
    };

    for (const key of Object.keys(addresses)) {
        multicallAddresses.set(parseInt(key), addresses[parseInt(key)]);
    }
}

export { multicallAddresses };

export const multicallAbi = [
    {
        constant: true,
        inputs: [
            {
                components: [
                    {
                        internalType: 'address',
                        name: 'target',
                        type: 'address'
                    },
                    {
                        internalType: 'bytes',
                        name: 'callData',
                        type: 'bytes'
                    }
                ],
                internalType: 'struct Multicall.Call[]',
                name: 'calls',
                type: 'tuple[]'
            }
        ],
        name: 'aggregate',
        outputs: [
            {
                internalType: 'uint256',
                name: 'blockNumber',
                type: 'uint256'
            },
            {
                internalType: 'bytes[]',
                name: 'returnData',
                type: 'bytes[]'
            }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    },
    {
        constant: true,
        inputs: [
            {
                internalType: 'uint256',
                name: 'blockNumber',
                type: 'uint256'
            }
        ],
        name: 'getBlockHash',
        outputs: [
            {
                internalType: 'bytes32',
                name: 'blockHash',
                type: 'bytes32'
            }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    },
    {
        constant: true,
        inputs: [],
        name: 'getCurrentBlockCoinbase',
        outputs: [
            {
                internalType: 'address',
                name: 'coinbase',
                type: 'address'
            }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    },
    {
        constant: true,
        inputs: [],
        name: 'getCurrentBlockDifficulty',
        outputs: [
            {
                internalType: 'uint256',
                name: 'difficulty',
                type: 'uint256'
            }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    },
    {
        constant: true,
        inputs: [],
        name: 'getCurrentBlockGasLimit',
        outputs: [
            {
                internalType: 'uint256',
                name: 'gaslimit',
                type: 'uint256'
            }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    },
    {
        constant: true,
        inputs: [],
        name: 'getCurrentBlockTimestamp',
        outputs: [
            {
                internalType: 'uint256',
                name: 'timestamp',
                type: 'uint256'
            }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    },
    {
        constant: true,
        inputs: [
            {
                internalType: 'address',
                name: 'addr',
                type: 'address'
            }
        ],
        name: 'getEthBalance',
        outputs: [
            {
                internalType: 'uint256',
                name: 'balance',
                type: 'uint256'
            }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    },
    {
        constant: true,
        inputs: [],
        name: 'getLastBlockHash',
        outputs: [
            {
                internalType: 'bytes32',
                name: 'blockHash',
                type: 'bytes32'
            }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    }
];
