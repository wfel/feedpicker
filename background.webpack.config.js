const templateConfig = require('./webpack.config.template');
const path = require('path');
const webpack = require('webpack');

console.assert(process.env.NODE_ENV == 'development' || process.env.NODE_ENV == 'production');

module.exports = Object.assign({}, templateConfig, {
  entry: './src/background.entry.js',
  output: {
    filename: 'background.bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        use: {
          loader: 'babel-loader',
        },
        exclude: file => (
          /node_modules/.test(file) &&
          !/\.vue\.js/.test(file)
        ),
      },
    ]
  }
});