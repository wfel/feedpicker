import moment from 'moment';

/**
 * Transform a time to human readable format with asia/shanghai locale
 * @param {Date|string|number} now time now (for responsive display)
 * @param {Date|string|number} time time you want to transform
 */
function getReadableTimeString(now, time) {
    var thatTime = moment(time);
    if(thatTime.isBefore(now, 'day')) {
        return thatTime.format('YYYY/MM/DD');
    } else {
        return '今天' + thatTime.format('HH:mm');
    }
}
export {
    getReadableTimeString
}