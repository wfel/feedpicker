module.exports = {
    plugins: [
        "@babel/plugin-transform-runtime"
    ],
    presets: [
        [
            "@babel/preset-env",
            {
                useBuiltIns: "usage",
                corejs: 3,
                targets: {
                    chrome: 46,
                    firefox: 49
                },
                modules: false
            }
        ]
    ]
};