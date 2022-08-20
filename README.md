# Feed Picker
一个帮助你订阅网页的浏览器扩展

## 简介 
总有一些重要网页不自带RSS也没有邮件通知，使你不得不经常手动查看这些网页的更新，同时还得小心核对，以免自己看漏了什么重要消息。你可能考虑过爬虫，但被其繁琐的设置过程打败了。Feed Picker就是来帮助你处理这些网页的。通过使用`源描述`描述这些网页，你能轻松地抓取这些网页上的信息，并且在信息有更新时及时得到提醒。

## 浏览器支持
Firefox 49+, chrome 46+  

## 安装

### Firefox
1. 打开`附加组件`页面;
2. 将 `feed_picker-firefox.xpi` 拖进该页面; 或者你可以点击页面右上的齿轮，点击下拉菜单中的"从文件安装附加组件", 选择 `feed_picker-firefox.xpi`.

### Chrome
由于Chrome的的扩展政策要求只能安装已在chrome扩展商店上架的扩展，你不能直接安装本扩展。但是，你可以将其解压后以开发者模式安装：
1. 将 `feed_picker-chrome.zip` 解压进一个目录 (以 `D` 表示);
2. 打开"扩展程序"页面, 点击右上角的"开发者模式"以启用安装开发中的扩展;
3. 点击"加载已解压的扩展程序", 选择 `D` 目录中的 `feed_picker_dist` 文件夹.

## `源`与`源描述`:
`源`是你的订阅的来源，`源描述`告诉 _Feed Picker_ 应该如何获取某个 `源`.  
这是一个`源描述`的例子(本例子中的`源描述`是一个Javascript对象; 但是在你将其复制进 _Feed Picker_ 的`源描述`输入框之前，**你必须将其转换成JSON** ):
```javascript
let exampleSourceDescription = {
    /**
     * catalogURL
     * 必需
     * 指向目录页面的链接（目录页面是一个订阅的唯一入口，你感兴趣的链接应该都在目录页面上）.
     * 建议使用https协议的网站，否则由于浏览器的限制，本扩展将有一些功能无法使用
     */
    catalogURL: "https://git-scm.com/book/zh/v2",
    /**
     * link
     * 可选
     * 如果源描述中不含link属性，或者link的值是 `undefined` 或者 `null`, 则link选项将被忽略
     * 提取的链接的首尾空白字符会被自动删去
     * 相对路径的链接会被转换成绝对路径
     */
    link: {
        /**
         * selector
         * 必需
         * 制定了这些链接在目录页上的**CSS选择器**。所有符合此选择器的元素都会被选中
         */
        selector: "li.chapter a",
        /**
         * pattern
         * 必需
         * pattern会分别在每个选中的元素上执行，最终提取出一个表示到达内容页面链接的字符串
         */
        pattern: {
            /**
             * 可以是以下几种之一：
             *
             * 这种会获取选中元素的HTML属性
             * {
             *  type: "attr",
             *  value: <string>，属性的名称
             * }
             * 
             * 这种会在选中元素的**outerHTML**上匹配你所指定的正则表达式
             * 这个正则表达式**必须**包含一个_[捕获括号](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_Expressions#special-capturing-parentheses)_，结果即第一个捕获括号捕获的字符串
             * {
             *  type: "regexp",
             *  value: <string>，正则表达式（不包括开头和结尾的斜线）
             * }
             * 
             * 获取元素的innerHTML
             * {
             *  type: "innerHTML"
             * }
             * 
             * 获取元素的outerHTML
             * {
             *  type: "outerHTML"
             * }
             * 
             * 获取元素的textContent
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
     * 可选
     * 表示一个内容页面的标题
     * 除了多了一个from属性，其余结构同link
     */
    title: {
        /**
         * from
         * 必需，可以是以下两个中的任意一个： "catalog" | "link"
         * 指定标题应从目录页面("catalog")抓取，还是从内容页面("link")抓取
         * 如果从目录页面抓取，那么下面selector属性所选择的元素个数必须与link属性相等，且在意义上与link属性的同一位置的值一一对应（如果有link属性的话）
         * 如果从内容页面抓取，那么selector所指定的选择器只会获取**第一个**被该选择器选中的元素（每页一个，与link属性一一对应）。这种情况下，必须确保有link属性
         */
        from: "link",
        // 必需，描述见link.selector
        selector: "#main > h1",
        // 必需，描述见link.pattern
        pattern: {
            type: "textContent"
        }
    },
    /**
     * date
     * 可选
     * 表示这个内容页面的发布时间
     * 本扩展使用 `moment-timezone` 库对时间进行**指定时区**的解析
     */
    date: {
        /**
         * from
         * 必需
         * 可以是 "catalog" 或 "link" 或 **"now"**（表示页面的发布时间是现在，适用于页面没有时间可以抓取的情况）
         */
        from: "now",
        /* 如果 "from" 是 "link" 或 "catalog"则为必需，如果 "from" 是 "now" 则此属性被忽略 */
        selector: "#DataGrid1 > tbody > tr:not(.datagridhead) > td:nth-child(3)",
        /* 如果 "from" 是 "link" 或 "catalog"则为必需，如果 "from" 是 "now" 则此属性被忽略 */
        pattern: {
            type: "textContent"
        },
        /**
         * format
         * 如果 "from" 是 "link" 或 "catalog"则为必需，如果 "from" 是 "now" 则此属性被忽略
         * 时间格式
         * 参考 https://momentjs.com/docs/#/parsing/string-format/
         */
        format: "YYYY-MM-DD HH:mm:ss",
        /**
         * timeZone
         * 必需
         * 时区
         * 抓取到的时间字符串将被看作是这个时区的时间
         * tz代码参考 https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
         */
        timeZone: "Asia/Shanghai"
    },
    /** 
     * content
     * 可选
     * 表示一个内容页面的实际内容
     * 与link有相同的格式
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
     * 必需
     * 是一个包含以下值中至少一个、至多全部（无重复）的**数组**："link" || "title" || "date" || "content"
     * 出现在数组中的属性在源描述中必须存在（且合法）
     * 用于标识一个唯一的页面，若抓取到了多个key相同的页面，则他们会在hash对比后进行合并
     */
    key: ["link"],
    /**
     * hash
     * 必需
     * 是一个包含以下值中至少一个、至多全部（无重复）的**数组**: "link" || "title" || "date" || "content" || "key"
     * 用于标识一个内容页面的版本。页面版本的更新依靠这个hash值
     * 如果在多次抓取之间，内容页面有更新，但hash值不变，内容页面就不会被更新
     */
    hash: ["title", "content"]
}
```
源描述中所有的属性和值均**大小写敏感**。
