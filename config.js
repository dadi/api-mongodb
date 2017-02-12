var convict = require('convict')
var fs = require('fs')

// Define a schema
var conf = convict({
  env: {
    doc: "The applicaton environment.",
    format: ["production", "development", "test", "qa"],
    default: "development",
    env: "NODE_ENV",
    arg: "node_env"
  }
})

// Load environment dependent configuration
var env = conf.get('env')
conf.loadFile('./config/mongodb.' + env + '.json')

// Perform validation
conf.validate({strict: false});

// Load domain-specific configuration
// conf.updateConfigDataForDomain = function(domain) {
//   var domainConfig = './config/' + domain + '.json';
//   try {
//     var stats = fs.statSync(domainConfig);
//     // no error, file exists
//     conf.loadFile(domainConfig);
//     conf.validate({strict: false});
//   }
//   catch(err) {
//     if (err.code === 'ENOENT') {
//       //console.log('No domain-specific configuration file: ' + domainConfig);
//     }
//     else {
//       console.log(err);
//     }
//   }
// };

module.exports = conf
// module.exports.configPath = function() {
//   return './config/config.' + conf.get('env') + '.json';
// }
