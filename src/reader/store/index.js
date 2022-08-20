import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

import moment from 'moment';

import { addListener as addRuntimeListener } from '../../utils/browser-runtime-events';
import { backendCall } from '../utils/background-call';

const store = new Vuex.Store({
    state: {
        currSourceId: '',
        currArticleKey: '',
        currArticleVer: 0,
        currArticlePrimaryKey: -1, // control redundancy by setArticleWithoutPrimaryKey
        isArticleValid: false,

        now: new Date(),
        pageWidth: 'full'
    },
    getters: {
        currArticleId: state => [state.currSourceId, state.currArticleKey]
    },
    mutations: {
        // 除了articleVer, 任何关于articleId(或primary)的改变都会导致valid: false, 只有在commit之后手动设置valid: true才能使设置的文章有效
        setSourceId(state, newSourceId) {
            state.currSourceId = newSourceId;
            state.isArticleValid = false;
        },
        setArticleKey(state, newKey) {
            state.currArticleKey = newKey;
            state.isArticleValid = false;
        },
        setArticleVer(state, newVer) {
            state.currArticleVer = newVer;
        },
        setPrimaryKey(state, primaryKey) {
            state.currArticlePrimaryKey = primaryKey;
            state.isArticleValid = false;
        },
        setValidity(state, isValid) {
            state.isArticleValid = Boolean(isValid);
        },
        setNow(state, newDate) {
            state.now = newDate;
        },
        setPageWidth(state, newWidthStr) {
            state.pageWidth = newWidthStr;
        }
    },
    actions: {
        setArticle(context, {newSourceId, newArticleKey, newPrimaryKey, newVersionIndex}) {
            // this action **set the article valid automatically**
            context.commit('setSourceId', newSourceId);
            context.commit('setArticleKey', newArticleKey);
            context.commit('setPrimaryKey', newPrimaryKey);
            context.commit('setArticleVer', newVersionIndex);
            context.commit('setValidity', true);
        },
        // setArticleWithoutPrimaryKey
        setArticleWithoutPrimaryKey(context, {newSourceId, newArticleKey, newVersionIndex}) {
            backendCall(
                'getPrimaryKey',
                newSourceId,
                newArticleKey
            ).then(primaryKey => {
                if(!primaryKey) primaryKey = -1;
                context.dispatch('setArticle', {
                    newSourceId,
                    newArticleKey,
                    newPrimaryKey: primaryKey,
                    newVersionIndex
                })
            });
        },
        invalidateArticle(context) {
            context.commit('setArticleKey', '');
            context.commit('setPrimaryKey', -1);
            context.commit('setArticleVer', 0);
            context.commit('setValidity', false);
        },
        setSourceIdAndValidate(context, newSourceId) {
            if(context.state.currSourceId !== newSourceId) {
                context.commit('setSourceId', newSourceId);
                context.dispatch('invalidateArticle');
            }
        }
    }
});

addRuntimeListener('source:delete', deletedSourceId => {
    if(deletedSourceId === store.state.currSourceId) {
        // validate global state
        store.dispatch('setSourceIdAndValidate', '');
    }
});

var interval = setInterval(() => {
    var now = new Date();
    if(moment(store.state.now).isBefore(now, 'day')) {
        // set new day
        store.commit('setNow', now);
    }
}, 60 * 1000);

export default store;