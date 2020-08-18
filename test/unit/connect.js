const EventEmitter = require('events').EventEmitter
const help = require('./helper')
const MongoDBAdapter = require('../../lib')
const should = require('should')
const sinon = require('sinon')
const config = require(__dirname + '/../../config')

const DATABASES = [
  {
    id: 'authdb',
    hosts: '127.0.0.1:27017',
    username: 'johndoe',
    password: 'topsecret'
  },
  {
    id: 'defaultdb',
    hosts: '127.0.0.1:27017',
    default: true
  },
  {
    id: 'invaliddb',
    hosts: '127.0.0.1:27019'
  },
  {
    id: 'replicadb',
    hosts: '127.0.0.1:27017',
    replicaSet: 'rs0'
  },
  {
    id: 'somedb',
    hosts: '127.0.0.1:27017',
    username: 'johndoe',
    password: 'topsecret'
  },
  {
    id: 'secondary',
    hosts: '127.0.0.1:27018'
  },
  {
    id: 'testdb',
    hosts: '127.0.0.1:27017'
  }
]

const DATABASES_NO_DEFAULT = [
  {
    id: 'authdb',
    hosts: '127.0.0.1:27017',
    username: 'johndoe',
    password: 'topsecret'
  },
  {
    id: 'defaultdb',
    hosts: '127.0.0.1:27017'
  },
  {
    id: 'invaliddb',
    hosts: '127.0.0.1:27019'
  },
  {
    id: 'replicadb',
    hosts: '127.0.0.1:27017',
    replicaSet: 'rs0'
  },
  {
    id: 'somedb',
    hosts: '127.0.0.1:27017',
    username: 'johndoe',
    password: 'topsecret'
  },
  {
    id: 'secondary',
    hosts: '127.0.0.1:27018'
  },
  {
    id: 'testdb',
    hosts: '127.0.0.1:27017'
  }
]

describe('MongoDB connection', function() {
  this.timeout(2000)

  describe('getDatabaseOptions', function() {
    it('should use the legacy `database` property to determine the default database, if no `default` property is set', () => {
      return help
        .setConfig({
          database: 'defaultdb',
          databases: DATABASES_NO_DEFAULT,
          hosts: [{host: '127.0.0.1', port: 27017}]
        })
        .then(restoreConfig => {
          const mongoDb = new MongoDBAdapter()
          const database = mongoDb.getDatabaseOptions({
            database: 'somedb',
            override: false
          })

          database.id.should.eql(DATABASES[1].id)
          database.hosts.should.eql(DATABASES[1].hosts)

          return restoreConfig()
        })
    })

    it('should connect to the only database in `databases` even if it does not have a `default` property', () => {
      return help
        .setConfig({
          databases: [DATABASES_NO_DEFAULT[1]]
        })
        .then(restoreConfig => {
          const mongoDb = new MongoDBAdapter()
          const database = mongoDb.getDatabaseOptions({
            database: 'somedb',
            override: false
          })

          database.id.should.eql(DATABASES_NO_DEFAULT[1].id)
          database.hosts.should.eql(DATABASES_NO_DEFAULT[1].hosts)

          return restoreConfig()
        })
    })

    it('should use block of specified database if it exists and `override` is set to true', () => {
      return help
        .setConfig({
          databases: DATABASES
        })
        .then(restoreConfig => {
          const mongoDb = new MongoDBAdapter()
          const database = mongoDb.getDatabaseOptions({
            database: 'somedb',
            override: true
          })

          database.should.eql(DATABASES[4])

          return restoreConfig()
        })
    })

    it('should use block of default database if `override` is set to false', () => {
      return help
        .setConfig({
          databases: DATABASES
        })
        .then(restoreConfig => {
          const mongoDb = new MongoDBAdapter()
          const database = mongoDb.getDatabaseOptions({
            database: 'somedb',
            override: false
          })

          database.id.should.eql('defaultdb')
          database.hosts.should.eql(DATABASES[1].hosts)

          return restoreConfig()
        })
    })

    it('should use top-level database block if there is no entry in the `databases` block', () => {
      return help
        .setConfig({
          database: 'defaultdb',
          databases: [],
          hosts: [{host: '127.0.0.1', port: 27017}]
        })
        .then(restoreConfig => {
          const mongoDb = new MongoDBAdapter()
          const database = mongoDb.getDatabaseOptions({
            database: 'defaultdb',
            override: false
          })

          database.id.should.eql('defaultdb')
          database.hosts.should.eql(DATABASES[1].hosts)

          return restoreConfig()
        })
    })
  })

  describe('getConnectionString', function() {
    it('should construct a connection string with all hosts', () => {
      const mongoDb = new MongoDBAdapter()
      const connectionString1 = mongoDb.getConnectionString({
        id: 'somedb1',
        hosts: '123.456.78.9:1234'
      })
      const connectionString2 = mongoDb.getConnectionString({
        id: 'somedb2',
        hosts: '123.456.78.9:1234,321.654.78.9:4321'
      })

      connectionString1.should.eql('mongodb://123.456.78.9:1234/somedb1')
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234,321.654.78.9:4321/somedb2'
      )
    })

    it('should include username and password if both properties are defined', () => {
      const mongoDb = new MongoDBAdapter()
      const connectionString1 = mongoDb.getConnectionString({
        id: 'somedb1',
        hosts: '123.456.78.9:1234',
        username: 'johndoe'
      })
      const connectionString2 = mongoDb.getConnectionString({
        id: 'somedb2',
        hosts: '123.456.78.9:1234',
        password: 'whoami'
      })
      const connectionString3 = mongoDb.getConnectionString({
        id: 'somedb3',
        hosts: '123.456.78.9:1234',
        username: 'johndoe',
        password: 'whoami'
      })
      const connectionString4 = mongoDb.getConnectionString({
        id: 'somedb4',
        hosts: '123.456.78.9:1234,321.654.78.9:4321',
        username: 'johndoe',
        password: 'whoami'
      })

      connectionString1.should.eql('mongodb://123.456.78.9:1234/somedb1')
      connectionString2.should.eql('mongodb://123.456.78.9:1234/somedb2')
      connectionString3.should.eql(
        'mongodb://johndoe:whoami@123.456.78.9:1234/somedb3'
      )
      connectionString4.should.eql(
        'mongodb://johndoe:whoami@123.456.78.9:1234,321.654.78.9:4321/somedb4'
      )
    })

    it('should include `authMechanism` when specified, if username and password are set', () => {
      const mongoDb = new MongoDBAdapter()
      const connectionString1 = mongoDb.getConnectionString({
        id: 'somedb1',
        authMechanism: 'MONGODB-X509',
        hosts: '123.456.78.9:1234',
        username: 'johndoe'
      })
      const connectionString2 = mongoDb.getConnectionString({
        id: 'somedb2',
        authMechanism: 'MONGODB-X509',
        hosts: '123.456.78.9:1234',
        password: 'whoami'
      })
      const connectionString3 = mongoDb.getConnectionString({
        id: 'somedb3',
        authMechanism: 'MONGODB-X509',
        hosts: '123.456.78.9:1234',
        username: 'johndoe',
        password: 'whoami'
      })

      connectionString1.should.eql('mongodb://123.456.78.9:1234/somedb1')
      connectionString2.should.eql('mongodb://123.456.78.9:1234/somedb2')
      connectionString3.should.eql(
        'mongodb://johndoe:whoami@123.456.78.9:1234/somedb3?authMechanism=MONGODB-X509'
      )
    })

    it('should include `authDatabase` when specified, if username and password are set', () => {
      const mongoDb = new MongoDBAdapter()
      const connectionString1 = mongoDb.getConnectionString({
        id: 'somedb1',
        authDatabase: 'myauth',
        hosts: '123.456.78.9:1234',
        username: 'johndoe'
      })
      const connectionString2 = mongoDb.getConnectionString({
        id: 'somedb2',
        authDatabase: 'myauth',
        hosts: '123.456.78.9:1234',
        password: 'whoami'
      })
      const connectionString3 = mongoDb.getConnectionString({
        id: 'somedb3',
        authDatabase: 'myauth',
        hosts: '123.456.78.9:1234',
        username: 'johndoe',
        password: 'whoami'
      })

      connectionString1.should.eql('mongodb://123.456.78.9:1234/somedb1')
      connectionString2.should.eql('mongodb://123.456.78.9:1234/somedb2')
      connectionString3.should.eql(
        'mongodb://johndoe:whoami@123.456.78.9:1234/somedb3?authSource=myauth'
      )
    })

    it('should include `ssl` when specified', () => {
      const mongoDb = new MongoDBAdapter()
      const connectionString1 = mongoDb.getConnectionString({
        id: 'somedb1',
        hosts: '123.456.78.9:1234'
      })
      const connectionString2 = mongoDb.getConnectionString({
        id: 'somedb2',
        hosts: '123.456.78.9:1234',
        ssl: true
      })

      connectionString1.should.eql('mongodb://123.456.78.9:1234/somedb1')
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234/somedb2?ssl=true'
      )
    })

    it('should include `maxPoolSize` when specified', () => {
      const mongoDb = new MongoDBAdapter()
      const connectionString1 = mongoDb.getConnectionString({
        id: 'somedb1',
        hosts: '123.456.78.9:1234'
      })
      const connectionString2 = mongoDb.getConnectionString({
        id: 'somedb2',
        hosts: '123.456.78.9:1234',
        maxPoolSize: 50
      })

      connectionString1.should.eql('mongodb://123.456.78.9:1234/somedb1')
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234/somedb2?maxPoolSize=50'
      )
    })

    it('should include `replicaSet` when specified', () => {
      const mongoDb = new MongoDBAdapter()
      const connectionString1 = mongoDb.getConnectionString({
        id: 'somedb1',
        hosts: '123.456.78.9:1234'
      })
      const connectionString2 = mongoDb.getConnectionString({
        id: 'somedb2',
        hosts: '123.456.78.9:1234',
        replicaSet: 'rs0'
      })

      connectionString1.should.eql('mongodb://123.456.78.9:1234/somedb1')
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234/somedb2?replicaSet=rs0'
      )
    })

    it('should include `readPreference` when specified', () => {
      const mongoDb = new MongoDBAdapter()
      const connectionString1 = mongoDb.getConnectionString({
        id: 'somedb1',
        hosts: '123.456.78.9:1234'
      })
      const connectionString2 = mongoDb.getConnectionString({
        id: 'somedb2',
        hosts: '123.456.78.9:1234',
        readPreference: 'nearest'
      })

      connectionString1.should.eql('mongodb://123.456.78.9:1234/somedb1')
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234/somedb2?readPreference=nearest'
      )
    })
  })

  describe('connect', function() {
    it('should set readyState to 1 when connected', function(done) {
      const mongodb = new MongoDBAdapter()

      mongodb
        .connect()
        .then(() => {
          mongodb.database.should.be.an.instanceOf(EventEmitter)
          done()
        })
        .catch(err => {
          console.log(err)
        })
    })

    it('should assign Db to the database property', function(done) {
      const mongodb = new MongoDBAdapter()

      mongodb
        .connect()
        .then(() => {
          mongodb.database.should.be.an.instanceOf(EventEmitter)
          done()
        })
        .catch(err => {
          console.log(err)
        })
    })

    it('should reject when connecting with invalid credentials', function(done) {
      const newDatabases = JSON.parse(JSON.stringify(DATABASES_NO_DEFAULT))

      newDatabases[0].default = true

      help
        .setConfig({
          databases: newDatabases,
          hosts: [{host: '127.0.0.1', port: 27017}]
        })
        .then(restoreConfig => {
          const mongodb = new MongoDBAdapter()

          mongodb.connect().catch(err => {
            should.exist(err)
            err.message.should.eql('Authentication failed.')

            restoreConfig().then(() => done())
          })
        })
    })

    it('should listen to database-specific environment variables', function(done) {
      process.env.DB_1_HOST = '127.0.0.1:27017'

      config.loadConfig()

      const mongodb = new MongoDBAdapter()

      mongodb.connect().then(() => {
        delete process.env.DB_1_HOST

        done()
      })
    })

    it("should reject when connection can't be established", function(done) {
      const newDatabases = JSON.parse(JSON.stringify(DATABASES_NO_DEFAULT))

      newDatabases[2].default = true

      help
        .setConfig({
          databases: newDatabases
        })
        .then(restoreConfig => {
          const mongodb = new MongoDBAdapter()

          mongodb.connect().catch(err => {
            should.exist(err)

            restoreConfig().then(() => done())
          })
        })
    })

    it("should reject when replicaSet servers can't be found", function(done) {
      const newDatabases = JSON.parse(JSON.stringify(DATABASES_NO_DEFAULT))

      newDatabases[3].default = true

      help
        .setConfig({
          databases: newDatabases,
          hosts: [{host: '127.0.0.1', port: 27017}]
        })
        .then(restoreConfig => {
          const mongodb = new MongoDBAdapter()
          const spy = sinon.spy(mongodb._mongoClient, 'connect')

          mongodb.connect().catch(err => {
            should.exist(err)
            err.should.be.Error

            spy
              .getCall(0)
              .args[0].should.eql(
                'mongodb://127.0.0.1:27017/replicadb?replicaSet=rs0'
              )
            spy.restore()

            restoreConfig().then(() => done())
          })
        })
    })
  })

  describe('error states', function() {
    it('`insert` should reject when not connected', function(done) {
      const mongodb = new MongoDBAdapter()

      mongodb.connect({hi: 'there'}).then(() => {
        mongodb.readyState = 0

        mongodb
          .insert({query: {}, collection: 'testdb', schema: {}})
          .catch(err => {
            should.exist(err)
            err.should.be.Error
            err.message.should.eql('DB_DISCONNECTED')

            done()
          })
      })
    })

    it('`update` should reject when not connected', function(done) {
      const mongodb = new MongoDBAdapter()

      mongodb.connect().then(() => {
        mongodb.readyState = 0

        mongodb
          .update({query: {}, collection: 'testdb', schema: {}})
          .catch(err => {
            should.exist(err)
            err.should.be.Error
            err.message.should.eql('DB_DISCONNECTED')
          })
        done()
      })
    })

    it('`find` should reject when not connected', function(done) {
      const mongodb = new MongoDBAdapter()

      mongodb.connect().then(() => {
        mongodb.readyState = 0

        mongodb
          .find({query: {}, collection: 'testdb', schema: {}})
          .catch(err => {
            should.exist(err)
            err.should.be.Error
            err.message.should.eql('DB_DISCONNECTED')
          })
        done()
      })
    })

    it('`delete` should reject when not connected', function(done) {
      const mongodb = new MongoDBAdapter()

      mongodb.connect().then(() => {
        mongodb.readyState = 0

        mongodb
          .delete({query: {}, collection: 'testdb', schema: {}})
          .catch(err => {
            should.exist(err)
            err.should.be.Error
            err.message.should.eql('DB_DISCONNECTED')
          })
        done()
      })
    })

    it('`stats` should reject when not connected', function(done) {
      const mongodb = new MongoDBAdapter()

      mongodb.connect().then(() => {
        mongodb.readyState = 0

        mongodb.stats('testdb', {}).catch(err => {
          should.exist(err)
          err.should.be.Error
          err.message.should.eql('DB_DISCONNECTED')
        })
        done()
      })
    })
  })
})
