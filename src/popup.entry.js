import browser from './utils/browser-polyfill';
import Vue from 'vue';

import backendCaller from './reader/utils/background-call';
import app from './popup-page/app.vue';

// browser.tabs.create({
//     active: true,
//     url: 'reader.html'
// });
browser.browserAction.setBadgeText({text: ''});
// browser.browserAction.setIcon({
//     path: "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40' width='40' height='40'%3e%3ccircle cx='20' cy='20' r='20' fill='black' stroke='%23aaa' stroke-width='2' /%3e%3c/svg%3e"
// });

backendCaller.init().then(() => {
    new Vue({
        render(h) {
            return h(app);
        }
    }).$mount('#app');
});