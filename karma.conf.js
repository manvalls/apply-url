const path = require('path')
require('webpack')

module.exports = function(config) {
  config.set({
    browsers: ['Chrome'],
    singleRun: true,
    frameworks: ['mocha'],
    files: [
      'test/index.js',
    ],
    preprocessors: {
      'test/index.js': ['webpack'],
    },
    webpack: {
      mode: 'development',
      module: {
        rules: [
          {
            test: /\.js$/,
            use: {
              loader: 'istanbul-instrumenter-loader',
              options: { esModules: true },
            },
            include: path.resolve('src/'),
          },
        ],
      },
    },
    reporters: ['dots', 'coverage-istanbul'],
    coverageIstanbulReporter: {
      reports: ['html', 'text-summary'],
      fixWebpackSourcePaths: true,
    },
    webpackServer: {
      noInfo: true,
    },
  })
}
