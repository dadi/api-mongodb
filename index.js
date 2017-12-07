const path = require('path')

module.exports = require(
  path.join(__dirname, 'lib')
)

module.exports.settings = {
  connectWithCollection: true,
  internalProperties: ['_id']
}
