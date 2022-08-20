import { murmur3 } from 'murmurhash-js';
const seed = 42;

export default function(key) {
    // key must be a string
    // return value of murmur3 is a 32bit integer
    // then pad it to length 8
    if(key && key.toString)
        key = key.toString();
    else
        key = '';
    return Number(murmur3(key, seed)).toString(16).padStart(8, '0');
}