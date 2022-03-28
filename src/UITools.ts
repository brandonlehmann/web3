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

import $ from 'jquery';
import 'gasparesganga-jquery-loading-overlay';

export { $ };

/**
 * Creates a new element in the DOM
 * @param type
 */
export const createElement = (type: string): JQuery<HTMLElement> => {
    return $(document.createElement(type));
};

export interface ILoadingOverlayOptions {
    override?: boolean;
    background?: string;
    backgroundClass?: string;
    image?: string;
    imageAnimation?: string;
    imageAutoResize?: boolean;
    imageResizeFactor?: number;
    imageColor?: string;
    imageClass?: string;
    imageOrder?: number;
    fontawesome?: string;
    fontawesomeAnimation?: string;
    fontawesomeAutoResize?: boolean;
    fontawesomeResizeFactor?: number;
    fontawesomeColor?: string;
    fontawesomeOrder?: number;
    custom?: string;
    customAnimation?: string;
    customAnimationResize?: boolean;
    customResizeFactor?: number;
    customOrder?: number;
    text?: string;
    testAnimation?: string;
    textAutoResize?:boolean;
    textResizeFactor?: number;
    textColor?: string;
    textClass?: string;
    textOrder?: number;
    progress?: boolean;
    progressAutoResize?: boolean;
    progressResizeFactor?: number;
    progressColor?: string;
    progressClass?: string;
    progressOrder?: number;
    progressFixedPosition?: string;
    progressSpeed?: number;
    progressMin?: number;
    progressMax?: number;
    size?: number;
    maxSize?: number;
    minSize?: number;
    direction?: string;
    fade?: [number | boolean, number | boolean];
    resizeInterval?: number;
    zIndex?: number;
}

export class Overlay {
    /**
     * Hides the displayed overlay
     */
    public static hide () {
        $(document.body).LoadingOverlay('hide');
    }

    /**
     * Shows an overlay with the specified options
     * @param text
     * @param options
     */
    public static show (text: string, options?: ILoadingOverlayOptions) {
        $(document.body).LoadingOverlay('show', options);
    }
}

/**
 * Displays a modal with jquery using the supplied elements, message, and style
 * @param success
 * @param message
 * @param statusTextElement
 * @param statusModalElement
 * @param style
 */
export const showStatusModal = (
    success: boolean,
    message: any,
    statusTextElement: JQuery<HTMLElement> = $('#statusText'),
    statusModalElement: JQuery<HTMLElement> = $('#statusModal'),
    style?: {successClass?: string, errorClass?: string}
) => {
    if (success) {
        statusTextElement.addClass(style?.successClass || 'alert-success');
        statusTextElement.removeClass(style?.errorClass || 'alert-danger');
    } else {
        statusTextElement.removeClass(style?.successClass || 'alert-success');
        statusTextElement.addClass(style?.errorClass || 'alert-danger');
    }

    if (message.data && message.data.message) {
        message = message.data.message;
    } else if (message.message) {
        message = message.message;
    }

    let finalMessage = message as string;

    if (finalMessage.toLowerCase().includes('while formatting outputs') ||
        finalMessage.toLowerCase().includes('internal error') ||
        finalMessage.toLowerCase().includes('header not found')) {
        finalMessage = 'Internal wallet error, please try again.';
    }

    finalMessage = finalMessage.replace('execution reverted:', '').trim();

    statusTextElement.text(finalMessage);

    if (finalMessage.length !== 0) {
        console.log(finalMessage);
        $.noConflict();
        statusModalElement.modal('toggle');
    }
};
