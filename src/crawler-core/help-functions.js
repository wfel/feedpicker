function patternMaker({
    type,
    value
}) {
    // strings are auto trimed
    switch (type) {
        case 'regexp':
            {
                let re = new RegExp(value);
                return elem => {
                    var elemHTML = elem.outerHTML;
                    var resArr = re.exec(elemHTML);
                    if(!resArr) {
                        // Be aware that null is not a empty string; If it is a null, probably your RegExp is wrong
                        return null;
                    } else if(resArr.length < 2) {
                        throw new Error('RegExp must have a capture group');
                    } else {
                        return resArr[1].trim(); // 被括号捕获的部分，如果没有捕获括号，那么throw一个error
                    }
                }
            }
        case 'attr':
            // "origin" of the target page will be preserved. "href" will return the correct URL.
            return elem => {
                if(!elem) return null;
                var val = elem.getAttribute(value);
                if(val === null) return null;
                return val.toString().trim();
            }
        case 'textContent':
            return elem => {
                if(!elem) return null;
                return elem.textContent.trim();
            }
        case 'innerHTML':
            return elem => {
                if(!elem) return null;
                return elem.innerHTML.trim();
            }
        case 'outerHTML':
            return elem => {
                if(!elem) return null;
                return elem.outerHTML.trim();
            }
    }
}

function checkPattern(pattern, prop) {
    if (!pattern.type) {
        throw new Error(`"pattern" in ${prop} does not have a type`);
    }

    const typeCanBe = ['attr', 'regexp', 'textContent', 'innerHTML', 'outerHTML'];
    if (!typeCanBe.includes(pattern.type)) {
        throw new Error(`"type" of "pattern" in "${prop}" can only be one of ${typeCanBe.join(' | ')}, got ${pattern.type}`);
    }

    const valueRequired = ['attr', 'regexp'];
    for (let p of valueRequired) {
        if (pattern.type === p && !pattern.value) {
            throw new Error(`"value" property of "pattern" in "${prop}" is required with "type" to be "${p}"`);
        }
    }
}

function checkSourceDescription(sourceDescription) {
    //var allAllowedProps = ['catalogURL', 'key', 'hash', 'link', 'title', 'date', 'content'];
    if (!sourceDescription || typeof sourceDescription !== 'object') {
        throw new Error(`The description must be an Object`);
    }

    var requiredProps = ['catalogURL', 'key', 'hash'];
    for (let prop of requiredProps) {
        if (!sourceDescription[prop]) {
            throw new Error(`SourceDescription does not have a required property "${prop}"`);
        }
    }

    var keyCanBe = ['link', 'title', 'date', 'content'];
    if (!sourceDescription.key.length)
        throw new Error('Key must have at least one property to extract from.');
    for (let key of sourceDescription.key) {
        if (!keyCanBe.includes(key)) {
            throw new Error(`Key can only be in ${keyCanBe.join(' | ')}, got ${key}`);
        } else if(!sourceDescription[key]) {
            throw new Error(`The description does not have the property "${key}" referred in description.key`);
        }
    }

    var hashCanBe = ['link', 'title', 'date', 'content', 'key'];
    for (let hash of sourceDescription.hash) {
        if (!hashCanBe.includes(hash)) {
            throw new Error(`Hash can only be in ${hashCanBe.join(' | ')}, got ${hash}`);
        } else if(!sourceDescription[hash]) {
            throw new Error(`The description does not have the property "${hash}" referred in description.hash`);
        }
    }

    var propsWithFrom = ['title', 'content'];
    var propsWithSelector = ['link', 'title', 'content'];
    
    if (sourceDescription.date) {
        // 特判
        if(sourceDescription.date.from !== 'now') {
            propsWithFrom.push('date');
            propsWithSelector.push('date');
            if (!sourceDescription.date.format) {
                throw new Error(`"format" property is required in "date". Check https://momentjs.com/docs/#/parsing/string-format/ for more information.`);
            }
            if (!sourceDescription.date.timeZone) {
                throw new Error(`"timeZone" property is required in "date". Check https://en.wikipedia.org/wiki/List_of_tz_database_time_zones for more information.`);
            }
        }
    }

    var fromCanBe = ['catalog', 'link'];
    for (let prop of propsWithFrom) {
        if (sourceDescription[prop]) {
            if (!sourceDescription[prop].from) {
                throw new Error(`Missing "from" property of "${prop}"`);
            } else if (!fromCanBe.includes(sourceDescription[prop].from)) {
                throw new Error(`"from" can only be ${fromCanBe.join(' | ')}, got ${sourceDescription[prop].from}`);
            }
        }
    }

    for (let prop of propsWithSelector) {
        if (sourceDescription[prop] && !sourceDescription[prop].selector) {
            throw new Error(`Missing "selector" property of "${prop}"`);
        }
    }

    var propsWithPattern = propsWithSelector;
    for (let prop of propsWithPattern) {
        if (sourceDescription[prop]) {
            if (!sourceDescription[prop].pattern) {
                throw new Error(`Missing "pattern" property of "${prop}"`);
            }
            checkPattern(sourceDescription[prop].pattern, prop);
        }
    }
}

export {
    patternMaker,
    checkSourceDescription
}