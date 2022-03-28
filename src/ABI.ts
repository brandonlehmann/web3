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

import { ethers } from 'ethers';

export default class ABI {
    /**
     * Encodes the values as an ABI structured string
     * @param name
     * @param inputs
     * @param params
     */
    public static encode (name: string, inputs: ethers.utils.ParamType[], params: any[]): string {
        const functionSignature = this.getFunctionSignature(name, inputs);

        const functionHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(functionSignature));

        const functionData = functionHash.substring(2, 10);

        const abiCoder = new ethers.utils.AbiCoder();

        const argumentString = abiCoder.encode(inputs, params);

        const argumentData = argumentString.substring(2);

        return `0x${functionData}${argumentData}`;
    }

    /**
     * Decodes an ABI encoded result
     * @param outputs
     * @param data
     */
    public static decode (outputs: ethers.utils.ParamType[], data: ethers.utils.BytesLike): ethers.utils.Result {
        const abiCoder = new ethers.utils.AbiCoder();

        return abiCoder.decode(outputs, data);
    }

    /**
     * Constructs the function signature for the specified method
     *
     * @param name
     * @param inputs
     * @private
     */
    private static getFunctionSignature (name: string, inputs: ethers.utils.ParamType[]): string {
        const types = [];

        for (const input of inputs) {
            if (input.type === 'tuple') {
                const tupleString = this.getFunctionSignature('', input.components);

                types.push(tupleString);
            } else if (input.type === 'tuple[]') {
                const tupleString = this.getFunctionSignature('', input.components);

                const arrayString = `${tupleString}[]`;

                types.push(arrayString);
            } else {
                types.push(input.type);
            }
        }

        const typeString: string = types.join(',');

        return `${name}(${typeString})`;
    }
}
