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

import fetch from 'cross-fetch';
import { sleep } from './Tools';

/** @ignore */
const IPFSGateways = [
    'https://ipfs.io/ipfs/',
    'https://dweb.link/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://gateway.ipfs.io/ipfs/'
];

/** @ignore */
const getRandomGateway = (): string => {
    const index = Math.round(Math.random() * (IPFSGateways.length - 1));
    return IPFSGateways[index];
};

export default class IPFSGatewayHelper {
    public static get gateway (): string {
        return getRandomGateway();
    }

    public static async fetch<Type = any> (
        path: string,
        payloadType: 'json' | 'text' | 'buffer' = 'json',
        retries = 3
    ): Promise<Type> {
        const response = await fetch(
            path.replace('ipfs://', getRandomGateway()));

        if (!response.ok) {
            if ((response.status === 429 || (response.status >= 500 && response.status < 600)) && retries > 0) {
                await sleep(1);

                return IPFSGatewayHelper.fetch<Type>(path, payloadType, --retries);
            }

            throw new Error(`${response.status}: ${response.statusText}`);
        }

        if (payloadType === 'json') {
            return response.json();
        } else if (payloadType === 'text') {
            return (await response.text()) as any;
        } else {
            return Buffer.from(await (await response.blob()).arrayBuffer()) as any;
        }
    }

    public static registerGateway (path: string) {
        if (!path.endsWith('/ipfs/') || !path.startsWith('https://')) {
            throw new Error('Incomplete IPFS gateway path, must be of form: https://<host>/ipfs/');
        }

        if (!IPFSGateways.includes(path.toLowerCase())) {
            IPFSGateways.push(path.toLowerCase());
        }
    }
}
