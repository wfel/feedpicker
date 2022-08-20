import browser from '../../utils/browser-polyfill';
var bgw;

function init() {
    var bg = browser.extension.getBackgroundPage();
    if(!bg || !bg.myBackend) {
        return Promise.reject('background window not found!');
    } else {
        bgw = bg;
        return Promise.resolve(bg);
    }
}

/**
 * Call a method on backgroundWindow.myBackend
 * Though some of the functions are synchronized, it should always be regarded as async for later upgrades.
 * @param {string} path Function path under backgroundWindow.myBackend. Path should be separated by '.' like key-path of indexed database.
 * @param  {...any} args Target function arguments
 */
async function backendCall(path, ...args) {
    let stops = path.split('.'), func = bgw.myBackend;
    for(let stop of stops) {
        try {
            func = func[stop];
        } catch(e) {
            throw new Error('Path error: myBackend.' + path);
        }
    }
    try {
        return func(...args);
    } catch (e) {
        console.error(e);
        throw e;
    }
}

export {
    backendCall
};

export default {
    init
};