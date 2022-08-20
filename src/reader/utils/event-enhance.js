/**
 * Exec callback when click event fired on elements out of componentRootVM or its children  
 * **Can be cancelled by set event.cancelOuterClick to true**
 * @param {*} rootVM root vue instance of the whole SPA. Use this as a workaround of firefox's [bug](https://stackoverflow.com/questions/45370448/firefox-fires-click-event-at-the-same-time-with-contextmenu-event)
 * @param {*} componentRoot root vue instance of the component; null/undefined for not having a componentRoot
 * @param {function} cb 
 * @param {boolean} once should the listener be removed once the callback was called
 */
function onOuterClick(rootVM, componentRootVM, cb, once=true) {
    var marker = function (event) {
        // console.log('marker fired');
        if(!event.bublePath) {
            event.bublePath = new Set([componentRootVM]);
        } else {
            event.bublePath.add(componentRootVM);
        }
    };
    var handler = function(event) {
        if(event.cancelOuterClick) return;
        // console.log('Outer click reached:');
        // console.log(event.target);
        if(!componentRootVM || !event.bublePath || !event.bublePath.has(componentRootVM)) {
            // console.log('Outer click fired:');
            // if(componentRootVM)
            //     console.log(componentRootVM.$el);
            if(once) {
                _remover();
            }
            cb(event);
        }
    };
    var removed = false;
    var _remover = function() {
        if(removed) return;
        if(componentRootVM)
            componentRootVM.$el.removeEventListener('click', marker);
        rootVM.$el.removeEventListener('click', handler);
        removed = true;
    };
    // edge case: this won't be fired if this function is called just in 'click' eventhandler of componentRootVM
    if(componentRootVM)
        componentRootVM.$el.addEventListener('click', marker);
    rootVM.$el.addEventListener('click', handler);
    return _remover;
}

export {
    onOuterClick
};