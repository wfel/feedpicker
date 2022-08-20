// Redundant. see storage-core/help-functions
import browser from './utils/browser-polyfill';
function creategs(updateInterval = 720, useBadge = true) {
    return {
        ver: 1,
        updateInterval,
        useBadge
    };
}
window.addEventListener('load', function() {
    var mask = document.getElementById('mask');
    var iptUpdateInterval = document.getElementById('update-interval');
    var iptUseBadge = document.getElementById('use-badge');
    var btnApply = document.getElementById('btn-apply');
    var btnAbort = document.getElementById('btn-abort');
    var oldgs, bgw;

    function setWithOldgs() {
        iptUpdateInterval.value = oldgs.updateInterval;
        if(oldgs.useBadge)
            iptUseBadge.checked = true;
        else
            iptUseBadge.checked = false;
    }

    function setOldgs(gs) {
        switch(gs.ver) {
            default:
            oldgs = creategs();
            bgw.myBackend.setGlobalSettings(oldgs);
            break;

            case 1:
            oldgs = gs;
            break;
        }
    }

    bgw = browser.extension.getBackgroundPage();
    setOldgs(bgw.myBackend.getGlobalSettings());
    setWithOldgs();
    btnApply.addEventListener('click', function () {
        mask.classList.remove('hidden');
        var obj = bgw.myBackend.setGlobalSettings(
            creategs(
                Math.round(parseInt(iptUpdateInterval.value, 10)),
                    iptUseBadge.checked)
        );
        setOldgs(obj.newGlobalSettings);
        setWithOldgs();
        mask.classList.add('hidden');
        alert('设置已应用');
    });
    btnAbort.addEventListener('click', setWithOldgs);
    mask.classList.add('hidden');
});
