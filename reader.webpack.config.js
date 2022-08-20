const path = require('path');
const webpack = require('webpack');

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const VueLoaderPlugin = require('vue-loader/lib/plugin')

console.assert(process.env.NODE_ENV == 'development' || process.env.NODE_ENV == 'production');

var isDev = process.env.NODE_ENV == 'development';
// decide to use postcss
module.exports = {
  mode: process.env.NODE_ENV,
  entry: './src/reader.entry.js',
  output: {
    filename: 'reader.bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          compilerOptions: {
            preserveWhitespace: false,
          },
        }
      },
      {
        // style中lang="postcss",则vue-loader会使用.postcss来匹配loader而不是使用.css来匹配loader
        test: /\.css$|\.postcss$/,
        use: [
          //isDev? 'vue-style-loader':MiniCssExtractPlugin.loader,
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1
            }
          },
          'postcss-loader'
        ]
      },
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
      {
        test: /\.(txt|html)$/i,
        use: 'raw-loader',
      },
    ]
  },
  plugins: [
    new webpack.ContextReplacementPlugin( // 减少moment.js的locale
      /moment[/\\]locale$/,
      /zh.*|en.*|de|fr|hu/
    ),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: "main.css",
    }),
    new VueLoaderPlugin()
  ],
  devtool: process.env.NODE_ENV == 'development' ? 'cheap-module-source-map' : false,
};