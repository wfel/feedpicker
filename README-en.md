# Feed Picker
An extension which makes subscriping pages with no RSS easily.

## Introduction
There are some webpages exist in the real world which neither have a RSS nor have a email subscription method to get you informed about its update, meanwhile these webpages are important to you. You could be tired checking them out manually once in a few hours, while being anxious about missing out something important. Feed Picker is here for you. By describing these webpages using `Source Description`s, you can get informed whenever something changes, and you can get clearly what has been changed without performing inch-by-inch searches yourself.

## Browser Support
Firefox 49+, chrome 46+  

## Install

### Firefox
1. Go to `Firefox Add-on(or extension, which is another name) Options` page;
2. Drag `feed_picker-firefox.xpi` into this page; or you click the cog on the top right side of the page, click "Install Add-on From Files ...", and choose `feed_picker-firefox.xpi`.

### Chrome
Due to chrome's policy that all extensions to be installed must be published on Chrome Web Store, you cannot install the extension directly. Instead, you can unpack it and install it as a unpacked extension:
1. Unpack `feed_picker-chrome.zip` into a folder (denoted by `D`);
2. Open "Chrome extensions" page, enable "Developer mode" on the top right side;
3. Click "Load Unpacked Extension ...", choose the folder `feed_picker_dist` in `D`.

## `Source` and `Source Description`:
`Source` is where your subscription comes from while `Source Description` tells _Feed Picker_ what the `source` looks like.  
Here is an example source description (as a javascript Object; but **it should be converted to JSON before you paste it into Feed Picker** ):
```javascript
let exampleSourceDescription = {
    /**
     * catalogURL
     * Required
     * Link to the catalog page, where the information(especially links to specific pages which you are interested in) should be extracted from.
     * "https" protocol suggested, or fome functions could be missing
     */
    catalogURL: "https://git-scm.com/book/zh/v2",
    /**
     * link
     * Optional
     * If it is `undefined` or `null`, then value of "link" property of each result object will be **undefined**
     * Specific the links to content pages
     * Text result of all the fields will be trimed automatically
     * Relative path will be automatically transformed into a absolute path, with the baseURL to be the "origin" of "catalogURL"
     */
    link: {
        /**
         * selector
         * Required
         * Specific the **CSS selector** of the elements. All of the elements which suits the selector will be selected.
         */
        selector: "li.chapter a",
        /**
         * pattern
         * Required
         * pattern will be executed on each selected link, one by one. A string will be extracted for each selected element.
         */
        pattern: {
            /** Can be one of those:
             * 
             * This will get the attribute"s value of selected element
             * {
             *  type: "attr",
             *  value: <string> of one html attribute
             * }
             * 
             * This will execute the regular expression on **outerHTML** of the element.
             * The RegExp **must** contain a _[capture brace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#special-capturing-parentheses)_ to capture the result
             * {
             *  type: "regexp",
             *  value: <string> of one RegExp, without the slashes on each side
             * }
             * 
             * This will get the innerHTML of the element
             * {
             *  type: "innerHTML"
             * }
             * 
             * This will get the outerHTML of the element
             * {
             *  type: "outerHTML"
             * }
             * 
             * This will get the textContent of the element
             * {
             *  type: "textContent"
             * }
             */
            type: "attr",
            value: "href"
        }
    },
    /**
     * title
     * Optional
     */
    title: {
        /**
         * from
         * Required
         * can be one of "catalog" | "link"
         * Specific whether the title should be extracted from, the catalog page("catalog") or the content page("link").
         * If it is extracted from catalog page, then title array will be paired(has the same length) with key array
         * If it is extracted from content page, then the selector will match only the **first element** and extract according to the pattern, and pair the extraction result with links extracted above in order. In this situation, "link" property of the source description becomes required
         */
        from: "link",
        // Required
        selector: "#main > h1",
        // Required
        pattern: {
            type: "textContent"
        }
    },
    /**
     * date
     * Optional
     * The time when the content page is published
     * We are using `moment-timezone` to parse date with time zone option
     */
    date: {
        /**
         * from
         * Required
         * from can be "catalog", "link" or **"now"**(Implies that the content page's publishing time is now, especially useful when the content page does not have a related publishing date)
         */
        from: "now",
        /* Required if value of "from" is "link" or "catalog" */
        selector: "#DataGrid1 > tbody > tr:not(.datagridhead) > td:nth-child(3)",
        /* Required if value of "from" is "link" or "catalog" */
        pattern: {
            type: "textContent"
        },
        /**
         * format
         * Required when from is not "now"
         * format of the date
         * See https://momentjs.com/docs/#/parsing/string-format/
         */
        format: "YYYY-MM-DD HH:mm:ss",
        /**
         * timeZone
         * Required when from is not "now"
         * It is the time zone of the time extracted. **NOT YOUR MACHINE'S TIME ZONE**.
         * See https://en.wikipedia.org/wiki/List_of_tz_database_time_zones for tz code.
         */
        timeZone: "Asia/Shanghai"
    },
    /** 
     * content
     * Optional
     * Real content of the content page
     * Use the same format as "title"
     */
    content: {
        "from": "link",
        "selector": "#main > div",
        "pattern": {
            "type": "outerHTML"
        }
    },
    /**
     * key
     * Required
     * **MUST** be an Array containing at least one of the following value: "link" || "title" || "date" || "content".
     * Used to identify a unique article. Articles with the same key will be merged.
     */
    key: ["link"],
    /**
     * hash
     * Required
     * MUST be an Array containing at least one of the following values: "link" || "title" || "date" || "content" || "key".
     * Used to identify if a article has a update.
     * If hash is not updated, the content will NOT update even if content actually has a update
     */
    hash: ["title", "content"]
}
```
All of the properties and values are **case sensitive**.
