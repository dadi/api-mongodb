const lib = require('./lib')

const settings = {
  connectWithCollection: true,
  internalProperties: ['_id'],
}

module.exports = lib
module.exports.settings = settings
