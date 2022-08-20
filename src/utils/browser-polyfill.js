var isFirefox = typeof InstallTrigger !== 'undefined';
var _browser = window.browser;
var chrome = window.chrome;

function cb2Promise(fn, self) {
    // related to this bug: https://github.com/tfoxy/chrome-promise/commit/935ef84d25ae252118a0d79523104cb15b9c1b40
    return function() {
        var args = [].slice.call(arguments);
        return new Promise(function(resolve, reject) {
            args.push(function(res) {
                resolve(res);
            });
            try {
                fn.apply(self, args);
            } catch(e) {
                reject(e);
            }
        });
    }
}

if(!isFirefox) {
    _browser = Object.assign(Object.create(chrome), {
        storage: {
            local: {
                get: cb2Promise(chrome.storage.local.get, chrome.storage.local),
                set: cb2Promise(chrome.storage.local.set, chrome.storage.local),
                remove: cb2Promise(chrome.storage.local.remove, chrome.storage.local),
                clear: cb2Promise(chrome.storage.local.clear, chrome.storage.local),
                getBytesInUse: cb2Promise(chrome.storage.local.getBytesInUs, chrome.storage.local)
            }
        },
        browserAction: {
            // bug for second arg(the callback) for browserAction API
            // https://github.com/mozilla/webextension-polyfill/issues/99
            setBadgeText: chrome.browserAction.setBadgeText, // allowing only one argument
            setBadgeBackgroundColor: chrome.browserAction.setBadgeBackgroundColor,
        },
        tabs: {
            create: cb2Promise(chrome.tabs.create, chrome.tabs)
        }
    });
}

export default _browser;