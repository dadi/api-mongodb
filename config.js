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
  },
  connectWithCollection: {
    doc: "Informs API it should include the collection name to build the connection string",
    format: Boolean,
    default: true,
  },
  hosts: {
    doc: "",
    format: Array,
    default: [
      {
        host: "127.0.0.1",
        port: 27017
      }
    ]
  },
  username: {
    doc: "",
    format: String,
    default: "",
    env: "DB_USERNAME"
  },
  password: {
    doc: "",
    format: String,
    default: "",
    env: "DB_PASSWORD"
  },
  authMechanism: {
    doc: "If no authentication mechanism is specified or the mechanism DEFAULT is specified, the driver will attempt to authenticate using the SCRAM-SHA-1 authentication method if it is available on the MongoDB server. If the server does not support SCRAM-SHA-1 the driver will authenticate using MONGODB-CR.",
    format: String,
    default: "DEFAULT",
    env: "DB_AUTH_MECHANISM"
  },
  authDatabase: {
    doc: "The database to authenticate against when supplying a username and password",
    format: String,
    default: "admin",
    env: "DB_AUTH_SOURCE"
  },
  database: {
    doc: "",
    format: String,
    default: "test",
    env: "DB_NAME"
  },
  ssl: {
    doc: "",
    format: Boolean,
    default: false
  },
  replicaSet: {
    doc: "",
    format: String,
    default: ""
  },
  readPreference: {
    doc: "Choose how MongoDB routes read operations to the members of a replica set - see https://docs.mongodb.com/manual/reference/read-preference/",
    format: ['primary', 'primaryPreferred', 'secondary', 'secondaryPreferred', 'nearest'],
    default: 'secondaryPreferred'
  },
  enableCollectionDatabases: {
    doc: "",
    format: Boolean,
    default: false
  }
})

// Load environment dependent configuration
var env = conf.get('env')
conf.loadFile('./config/mongodb.' + env + '.json')

module.exports = conf
