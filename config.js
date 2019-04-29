const convict = require('convict')

const DATABASE_SCHEMA = {
  authDatabase: {
    doc: 'The database to authenticate against when supplying a username and password',
    format: String,
    default: '',
    envTemplate: 'DB_{database}_AUTH_SOURCE'
  },
  authMechanism: {
    doc: 'If no authentication mechanism is specified or the mechanism DEFAULT is specified, the driver will attempt to authenticate using the SCRAM-SHA-1 authentication method if it is available on the MongoDB server. If the server does not support SCRAM-SHA-1 the driver will authenticate using MONGODB-CR.',
    format: String,
    default: '',
    envTemplate: 'DB_{database}_AUTH_MECHANISM'
  },
  maxPoolSize: {
    doc: 'The maximum number of connections in the connection pool',
    format: Number,
    default: 0,
    envTemplate: 'DB_{database}_MAX_POOL'
  },
  password: {
    doc: '',
    format: String,
    default: '',
    envTemplate: 'DB_{database}_PASSWORD'
  },
  readPreference: {
    doc: 'Choose how MongoDB routes read operations to the members of a replica set - see https://docs.mongodb.com/manual/reference/read-preference/',
    format: ['primary', 'primaryPreferred', 'secondary', 'secondaryPreferred', 'nearest'],
    default: 'secondaryPreferred'
  },
  replicaSet: {
    doc: '',
    format: String,
    default: ''
  },
  ssl: {
    doc: '',
    format: Boolean,
    default: false
  },
  username: {
    doc: '',
    format: String,
    default: '',
    envTemplate: 'DB_{database}_USERNAME'
  }
}

const MAIN_SCHEMA = {
  database: {
    default: 'api',
    doc: 'The name of the default database to be used',
    env: 'DB_NAME',
    format: String
  },
  databases: {
    default: {},
    doc: 'Configuration block for each of the databases used throughout the application',
    format: Object
  },
  enableCollectionDatabases: {
    default: false,
    doc: 'Whether to use a database specified in the collection endpoint',
    format: Boolean
  },
  env: {
    arg: 'node_env',
    default: 'development',
    doc: 'The applicaton environment.',
    env: 'NODE_ENV',
    format: ['production', 'development', 'test', 'qa']
  }
}

const mainConfig = convict(MAIN_SCHEMA)

// Load environment dependent configuration.
const environment = mainConfig.get('env')

mainConfig.loadFile(`./config/mongodb.${environment}.json`)
mainConfig.validate()

// Validating databases.
const databases = mainConfig.get('databases')

Object.keys(databases).forEach(databaseName => {
  const databaseConfig = convict(DATABASE_SCHEMA)

  databaseConfig.load(databases[databaseName])
  databaseConfig.validate()

  const schema = databaseConfig.getSchema().properties

  // Listening for database-specific environment variables.
  // e.g. DB_testdb_USERNAME
  Object.keys(schema).forEach(key => {
    if (typeof schema[key].envTemplate === 'string') {
      const envVar = schema[key].envTemplate.replace(
        '{database}',
        databaseName
      )

      if (process.env[envVar]) {
        mainConfig.set(`databases.${databaseName}.${key}`, process.env[envVar])
      }
    }
  })
})

module.exports = mainConfig
