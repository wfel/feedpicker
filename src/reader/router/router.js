import {
    getRoute,
    setRoute,
    clearRoute
} from './help-function';

var _store;

function init(store) {
    _store = store;

    window.addEventListener('hashchange', setStore);
    // _store.subscribeAction((action, state) => {
    //     if (action.type === 'setArticle') {
    //         setRoute(action.payload.newSourceId, action.payload.newArticleKey, action.payload.newVersionIndex);
    //     }
    // });

    _store.watch(state => [
        state.isArticleValid,
        state.currSourceId,
        state.currArticleKey,
        state.currArticleVer,
    ], (val, Oldval) => {
        // console.log(val);
        if (!val[0]) {
            clearRoute();
        } else {
            setRoute(val[1], val[2], val[3]);
        }
    });

    setStore();
}

function setStore() {
    var newRoute = getRoute();
    if (newRoute.sourceId && newRoute.key) {
        _store.dispatch('setArticleWithoutPrimaryKey', {
            newSourceId: newRoute.sourceId,
            newArticleKey: newRoute.key,
            newVersionIndex: newRoute.ver
        });
    }
}

export default {
    init
};