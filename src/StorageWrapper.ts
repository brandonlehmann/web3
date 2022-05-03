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

import * as ls from 'local-storage';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, rmdirSync } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';

/** @ignore */
const localStorageAvailable = !!(global && global.localStorage);
/** @ignore */
let localStoragePath = '';

if (!localStorageAvailable) {
    localStoragePath = resolve(`${tmpdir()}/localstorage`);
    if (!existsSync(localStoragePath)) {
        mkdirSync(localStoragePath);
    }
}

/** @ignore */
type Callback<TYPE = any> = (value: TYPE, old: TYPE, url: string) => void;

/** @ignore */
const Listeners = new Map<string, Callback[]>();

export default class StorageWrapper {
    /**
     * Clears the local storage
     */
    public static clear () {
        if (localStorageAvailable) {
            ls.clear();
        } else {
            if (existsSync(localStoragePath)) {
                rmSync(localStoragePath, { recursive: true });
            }
        }
    }

    /**
     * Returns if the key currently exists in local storage
     *
     * @param key
     */
    public static exists (key: string): boolean {
        return typeof StorageWrapper.get(key) !== 'undefined';
    }

    /**
     * Retrieves the value for the specified key if it exists in local storage
     *
     * @param key
     */
    public static get<TYPE> (key: string): TYPE | undefined {
        if (localStorageAvailable) {
            return ls.get<TYPE>(key);
        } else {
            try {
                const data = readFileSync(resolve(`${localStoragePath}/${key}`));
                return JSON.parse(data.toString());
            } catch {}
        }
    }

    /**
     * Removes a listener previously attached with StorageWrapper.on(key, fn).
     *
     * @param key
     * @param fn
     */
    public static off<TYPE = any> (key: string, fn: Callback<TYPE>) {
        const callbacks = Listeners.get(key) || [];
        Listeners.set(key, callbacks.filter(elem => elem.toString() !== fn.toString()));
    }

    /**
     * Listen for changes persisted against key on other tabs.
     * Triggers fn when a change occurs, passing the following arguments.
     *
     * value: the current value for key in local storage, parsed from the persisted JSON
     * old: the old value for key in local storage, parsed from the persisted JSON
     * url: the url for the tab where the modification came from
     *
     * @param key
     * @param fn
     */
    public static on<TYPE = any> (key: string, fn: Callback<TYPE>) {
        const callbacks = Listeners.get(key) || [];
        callbacks.push(fn);
        Listeners.set(key, callbacks);
    }

    /**
     * Returns the current local storage path if not browser
     */
    public static get path (): string {
        if (!localStorageAvailable) {
            return localStoragePath;
        } else {
            return 'browser';
        }
    }

    /**
     * Sets the local storage path if not browser
     *
     * @param value
     */
    public static set path (value: string) {
        if (!localStorageAvailable) {
            localStoragePath = resolve(value);
        }
    }

    /**
     * Removes the key from local storage
     *
     * @param key
     */
    public static remove (key: string) {
        const old = StorageWrapper.get(key);

        if (localStorageAvailable) {
            ls.remove(key);
        } else {
            if (existsSync(resolve(`${localStoragePath}/${key}`))) {
                rmdirSync(resolve(`${localStoragePath}/${key}`));
            }
        }

        const callbacks = Listeners.get(key) || [];
        for (const callback of callbacks) {
            callback(undefined, old, (localStorageAvailable) ? window.location.toString() : process.cwd());
        }
    }

    /**
     * Sets the value for the key in local storage
     *
     * @param key
     * @param value
     */
    public static set<TYPE> (key: string, value: TYPE) {
        const old = StorageWrapper.get<TYPE>(key);

        if (localStorageAvailable) {
            ls.set<TYPE>(key, value);
        } else {
            writeFileSync(resolve(`${localStoragePath}/${key}`), JSON.stringify(value, undefined, 4));
        }

        const callbacks = Listeners.get(key) || [];
        for (const callback of callbacks) {
            callback(value, old, (localStorageAvailable) ? window.location.toString() : process.cwd());
        }
    }
}
