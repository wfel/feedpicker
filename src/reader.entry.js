import Vue from 'vue';

import moment from 'moment';

import store from './reader/store/index';
import router from './reader/router/router';
import backendCaller from './reader/utils/background-call';

import app from './reader/app/app.vue';

moment.locale('zh-cn');

backendCaller.init() // This should be called first to enable backendCall
    .then(() => {
        // init store.state
        router.init(store);
        new Vue({
            store,
            render(h) {
                return h(app);
            }
        }).$mount('#app');
    });