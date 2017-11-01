const path = require('path')
const config = require(
  path.join(__dirname, 'config')
)

module.exports = require(
  path.join(__dirname, 'lib')
)

module.exports.settings = {
  connectWithCollection: config.get('connectWithCollection')
}
