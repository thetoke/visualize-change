const path = require("path");
const webpack = require("webpack");

const DIST = path.resolve(__dirname, "dist");

module.exports = {
  entry: "./src/index",

  output: {
    path: DIST,
    publicPath: "/",
    filename: "bundle.js"
  },

  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
      "process.env.MAPBOX_ACCESS_TOKEN": JSON.stringify(process.env.MAPBOX_ACCESS_TOKEN),
      "process.env.MAP_VECTOR_SOURCE_MAXZOOM": JSON.stringify(process.env.MAP_VECTOR_SOURCE_MAXZOOM),
      "process.env.MAP_LAYER_MINZOOM": JSON.stringify(process.env.MAP_LAYER_MINZOOM)
    })
  ],

  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.less$/,
        use: ["style-loader", "css-loader", "less-loader"]
      },
      {
        test: /\.(png|woff|woff2|eot|ttf|svg)$/,
        loader: "url-loader"
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        query: {
          presets: ["stage-1"],
          plugins: ["transform-react-jsx"]
        }
      }
    ]
  }
};
