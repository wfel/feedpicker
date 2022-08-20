function constructSearchString(sourceId, key, ver) {
    return (new URLSearchParams({sourceId, key, ver})).toString();
}

function deconstructSearchString(searchString) {
    let querys = new URLSearchParams(searchString);
    return {
        sourceId: querys.get('sourceId'),
        key: querys.get('key'),
        ver: parseInt(querys.get('ver'), 10)
    };
}

function getRoute() {
    var hash = String(window.location.hash);
    if(!hash || hash.length === 1) {
        return {};
    } else {
        return deconstructSearchString(hash.slice(1));
    }
}

function setRoute(sourceId, key, ver) {
    var queryStr = constructSearchString(sourceId, key, ver);
    window.history.replaceState({sourceId, key, ver}, 'Read ' + queryStr, '#' + queryStr);
}

function clearRoute() {
    var href = location.href;
    var i = href.indexOf('#');
    if(i >= 0) {
        let clearHref = href.slice(0, i);
        window.history.replaceState({}, 'Reader', clearHref);
    }
}

export {
    getRoute,
    setRoute,
    clearRoute,
    constructSearchString
}