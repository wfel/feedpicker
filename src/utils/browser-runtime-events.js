import browser from './browser-polyfill';
import {
    safeJSONstringify,
    safeJSONparse
} from './json-enhance';

var listenerMap = new Map();

function constructEvent(name, message) {
    return {
        name,
        message: safeJSONstringify(message)
    };
}

/**
 * This function pass all its arguments to constructEvent
 */
function dispatchRuntimeMessage(name, message) {
    var res;
    try {
        // 这个error好像catch不住，但是好像也没有关系
        res = browser.runtime.sendMessage(constructEvent(name, message));
    } catch(e) {
        console.warn(e);
    }
    return res;
}

function eventHandler(message, sender, sendResponse) {
    if(!listenerMap.has(message.name)) return;
    let listeners = listenerMap.get(message.name),
        parsedMessage = safeJSONparse(message.message);
    for(let listener of listeners) {
        listener(parsedMessage, sender, sendResponse);
    }
}

function addListener(name, cb) {
    if(!listenerMap.has(name)) {
        listenerMap.set(name, [cb]);
    } else {
        let listeners = listenerMap.get(name);
        listeners.push(cb);
    }
    
    return [name, cb];
}

function removeListener(name, listener) {
    if(!listenerMap.has(name)) return;
    let listeners = listenerMap.get(name);
    let i = listeners.indexOf(listener);
    if(i < 0) return;
    listeners.splice(i, 1);
    if(listeners.length === 0) {
        listenerMap.delete(name);
    }
}

browser.runtime.onMessage.addListener(eventHandler);

export {
    dispatchRuntimeMessage,
    addListener,
    removeListener
};