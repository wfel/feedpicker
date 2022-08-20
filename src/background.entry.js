import browser from './utils/browser-polyfill';
import myBackend from './background-script/function-provider';

const oneMinuteInMillisecond = 1000 * 60;

var globalUpdating = false;

async function checkGlobalUpdate() {
    // check if another function is running
    if (globalUpdating) return;

    // check if it is time to update
    var {
        lastGlobalUpdate
    } = myBackend.getSharedField();
    var {
        updateInterval,
        useBadge
    } = myBackend.getGlobalSettings();
    lastGlobalUpdate = new Date(lastGlobalUpdate);
    if ((Date.now() - lastGlobalUpdate.getTime()) / oneMinuteInMillisecond < updateInterval) return;

    var sources = myBackend.getSources();
    if(Object.keys(sources).length === 0) return;
    // execute the update
    globalUpdating = true;
    var shouldUpdateSourceIdList = Object.keys(sources).filter(sourceId => !sources[sourceId].settings.updatePaused);
    var results = await myBackend.updateArticles(shouldUpdateSourceIdList);

    // 除了Error会变成{errMsg}，其他保持原状
    myBackend.putToSharedStore('lastGlobalUpdateResult', results.map(result => {
        //console.log(result.result);
        return result.state ? result : {
            sourceId: result.sourceId,
            state: false,
            result: {
                errMsg: result.result.message
            }
        }
    }));

    if (useBadge) {
        // process result and set badget
        if (results.length > 0) {
            var someUpdate = results.some(({
                state,
                result
            }) => {
                if (!state) return false;
                var {
                    dbResult: {
                        inserted,
                        updated
                    }
                } = result;
                if (inserted.length > 0 || updated.length > 0) {
                    return true;
                } else {
                    return false;
                }
            });

            if (someUpdate) {
                browser.browserAction.setBadgeBackgroundColor({
                    color: '#43a6e2'
                });
                browser.browserAction.setBadgeText({
                    text: '+'
                });
            } else {
                let allFailed = results.every(({
                    state,
                    result
                }) => {
                    //console.log(state, result);
                    if (!state) return true;
                    var {
                        partiallyFailed,
                        failedArticles,
                        dbResult: {
                            inserted,
                            updated
                        }
                    } = result;
                    if (partiallyFailed && inserted.length === 0 && updated.length === 0) {
                        return true;
                    } else {
                        return false;
                    }
                });
                if (allFailed) {
                    browser.browserAction.setBadgeBackgroundColor({
                        color: '#f84b2f'
                    });
                    browser.browserAction.setBadgeText({
                        text: '!'
                    });
                } else {
                    let someFailed = results.some(({
                        state,
                        result
                    }) => {
                        if (!state) return true;
                        var {
                            partiallyFailed
                        } = result;
                        if (partiallyFailed) {
                            return true;
                        } else {
                            return false;
                        }
                    });
                    if (someFailed) {
                        browser.browserAction.setBadgeBackgroundColor({
                            color: '#ffd356'
                        });
                        browser.browserAction.setBadgeText({
                            text: 'i'
                        });
                    }
                }
            }
        }
    }

    // finish
    myBackend.setSharedField({
        lastGlobalUpdate: (new Date()).toISOString()
    });
    globalUpdating = false;
}

async function init() {
    await myBackend.init();
    var interval = setInterval(checkGlobalUpdate, oneMinuteInMillisecond);

    // expose the backend interface
    window.myBackend = myBackend;

    // interfaces only for test
    window.blockBackend = function () {
        var bool = true;
        var num = Math.round(10000000000 * Math.random());
        for (var i = 0; i < num; ++i) {
            bool = !bool;
        }
        return bool;
    }
    window.testDead = function (obj, str) {
        window.couldBeDeadObj = Object.assign({}, obj);
        window.couldBeDeadStr = str;
    }
}

init();