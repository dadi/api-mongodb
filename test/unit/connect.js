const helper = require('./helper.js')
const lib = require('../../lib')
const {DATABASES, DATABASES_NO_DEFAULT} = require('./databases.js')
const DataStore = require('../../lib/index.js')
const {loadConfig} = require('../../config.js')
const process = require('process')
const should = require('should')
// import sinon from 'sinon'

describe('MongoDB connection', function () {
  this.timeout(2000)

  describe('getDatabaseOptions', function () {
    it('should use the legacy `database` property to determine the default database, if no `default` property is set', async function () {
      const restoreConfig = await helper.setConfig({
        database: 'defaultdb',
        databases: DATABASES_NO_DEFAULT,
        hosts: [{host: '127.0.0.1', port: 27017}],
      })

      try {
        const datastore = new DataStore()
        const database = datastore.getDatabaseOptions({
          database: 'somedb',
          override: false,
        })

        database.id.should.eql(DATABASES[1].id)
        database.hosts.should.eql(DATABASES[1].hosts)
      } finally {
        await restoreConfig()
      }
    })

    it('should connect to the only database in `databases` even if it does not have a `default` property', async function () {
      const restoreConfig = await helper.setConfig({
        databases: [DATABASES_NO_DEFAULT[1]],
      })

      try {
        const datastore = new DataStore()
        const database = datastore.getDatabaseOptions({
          database: 'somedb',
          override: false,
        })

        database.id.should.eql(DATABASES_NO_DEFAULT[1].id)
        database.hosts.should.eql(DATABASES_NO_DEFAULT[1].hosts)
      } finally {
        await restoreConfig()
      }
    })

    it('should use block of specified database if it exists and `override` is set to true', async function () {
      const restoreConfig = await helper.setConfig({
        databases: DATABASES,
      })

      try {
        const datastore = new DataStore()
        const database = datastore.getDatabaseOptions({
          database: 'somedb',
          override: true,
        })

        database.should.eql(DATABASES[4])
      } finally {
        await restoreConfig()
      }
    })

    it('should use block of default database if `override` is set to false', async function () {
      const restoreConfig = await helper.setConfig({
        databases: DATABASES,
      })

      try {
        const datastore = new DataStore()
        const database = datastore.getDatabaseOptions({
          database: 'somedb',
          override: false,
        })

        database.id.should.eql('defaultdb')
        database.hosts.should.eql(DATABASES[1].hosts)
      } finally {
        await restoreConfig()
      }
    })

    it('should use top-level database block if there is no entry in the `databases` block', async function () {
      const restoreConfig = await helper.setConfig({
        database: 'defaultdb',
        databases: [],
        hosts: [{host: '127.0.0.1', port: 27017}],
      })

      try {
        const datastore = new DataStore()
        const database = datastore.getDatabaseOptions({
          database: 'defaultdb',
          override: false,
        })

        database.id.should.eql('defaultdb')
        database.hosts.should.eql(DATABASES[1].hosts)
      } finally {
        await restoreConfig()
      }
    })
  })

  describe('getConnectionString', function () {
    it('should construct a connection string with all hosts', function () {
      const datastore = new DataStore()
      const connectionString1 = datastore.getConnectionString({
        id: 'somedb1',
        hosts: '123.456.78.9:1234',
      })
      const connectionString2 = datastore.getConnectionString({
        id: 'somedb2',
        hosts: '123.456.78.9:1234,321.654.78.9:4321',
      })

      connectionString1.should.eql('mongodb://123.456.78.9:1234/somedb1')
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234,321.654.78.9:4321/somedb2',
      )
    })

    it('should include username and password if both properties are defined', function () {
      const datastore = new DataStore()
      const connectionString1 = datastore.getConnectionString({
        id: 'somedb1',
        hosts: '123.456.78.9:1234',
        username: 'johndoe',
      })
      const connectionString2 = datastore.getConnectionString({
        id: 'somedb2',
        hosts: '123.456.78.9:1234',
        password: 'whoami',
      })
      const connectionString3 = datastore.getConnectionString({
        id: 'somedb3',
        hosts: '123.456.78.9:1234',
        username: 'johndoe',
        password: 'whoami',
      })
      const connectionString4 = datastore.getConnectionString({
        id: 'somedb4',
        hosts: '123.456.78.9:1234,321.654.78.9:4321',
        username: 'johndoe',
        password: 'whoami',
      })

      connectionString1.should.eql('mongodb://123.456.78.9:1234/somedb1')
      connectionString2.should.eql('mongodb://123.456.78.9:1234/somedb2')
      connectionString3.should.eql(
        'mongodb://johndoe:whoami@123.456.78.9:1234/somedb3',
      )
      connectionString4.should.eql(
        'mongodb://johndoe:whoami@123.456.78.9:1234,321.654.78.9:4321/somedb4',
      )
    })

    it('should include `authMechanism` when specified, if username and password are set', function () {
      const datastore = new DataStore()
      const connectionString1 = datastore.getConnectionString({
        id: 'somedb1',
        authMechanism: 'MONGODB-X509',
        hosts: '123.456.78.9:1234',
        username: 'johndoe',
      })
      const connectionString2 = datastore.getConnectionString({
        id: 'somedb2',
        authMechanism: 'MONGODB-X509',
        hosts: '123.456.78.9:1234',
        password: 'whoami',
      })
      const connectionString3 = datastore.getConnectionString({
        id: 'somedb3',
        authMechanism: 'MONGODB-X509',
        hosts: '123.456.78.9:1234',
        username: 'johndoe',
        password: 'whoami',
      })

      connectionString1.should.eql('mongodb://123.456.78.9:1234/somedb1')
      connectionString2.should.eql('mongodb://123.456.78.9:1234/somedb2')
      connectionString3.should.eql(
        'mongodb://johndoe:whoami@123.456.78.9:1234/somedb3?authMechanism=MONGODB-X509',
      )
    })

    it('should include `authDatabase` when specified, if username and password are set', function () {
      const datastore = new DataStore()
      const connectionString1 = datastore.getConnectionString({
        id: 'somedb1',
        authDatabase: 'myauth',
        hosts: '123.456.78.9:1234',
        username: 'johndoe',
      })
      const connectionString2 = datastore.getConnectionString({
        id: 'somedb2',
        authDatabase: 'myauth',
        hosts: '123.456.78.9:1234',
        password: 'whoami',
      })
      const connectionString3 = datastore.getConnectionString({
        id: 'somedb3',
        authDatabase: 'myauth',
        hosts: '123.456.78.9:1234',
        username: 'johndoe',
        password: 'whoami',
      })

      connectionString1.should.eql('mongodb://123.456.78.9:1234/somedb1')
      connectionString2.should.eql('mongodb://123.456.78.9:1234/somedb2')
      connectionString3.should.eql(
        'mongodb://johndoe:whoami@123.456.78.9:1234/somedb3?authSource=myauth',
      )
    })

    it('should include `ssl` when specified', function () {
      const datastore = new DataStore()
      const connectionString1 = datastore.getConnectionString({
        id: 'somedb1',
        hosts: '123.456.78.9:1234',
      })
      const connectionString2 = datastore.getConnectionString({
        id: 'somedb2',
        hosts: '123.456.78.9:1234',
        ssl: true,
      })

      connectionString1.should.eql('mongodb://123.456.78.9:1234/somedb1')
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234/somedb2?ssl=true',
      )
    })

    it('should include `maxPoolSize` when specified', function () {
      const datastore = new DataStore()
      const connectionString1 = datastore.getConnectionString({
        id: 'somedb1',
        hosts: '123.456.78.9:1234',
      })
      const connectionString2 = datastore.getConnectionString({
        id: 'somedb2',
        hosts: '123.456.78.9:1234',
        maxPoolSize: 50,
      })

      connectionString1.should.eql('mongodb://123.456.78.9:1234/somedb1')
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234/somedb2?maxPoolSize=50',
      )
    })

    it('should include `replicaSet` when specified', function () {
      const datastore = new DataStore()
      const connectionString1 = datastore.getConnectionString({
        id: 'somedb1',
        hosts: '123.456.78.9:1234',
      })
      const connectionString2 = datastore.getConnectionString({
        id: 'somedb2',
        hosts: '123.456.78.9:1234',
        replicaSet: 'rs0',
      })

      connectionString1.should.eql('mongodb://123.456.78.9:1234/somedb1')
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234/somedb2?replicaSet=rs0',
      )
    })

    it('should include `readPreference` when specified', function () {
      const datastore = new DataStore()
      const connectionString1 = datastore.getConnectionString({
        id: 'somedb1',
        hosts: '123.456.78.9:1234',
      })
      const connectionString2 = datastore.getConnectionString({
        id: 'somedb2',
        hosts: '123.456.78.9:1234',
        readPreference: 'nearest',
      })

      connectionString1.should.eql('mongodb://123.456.78.9:1234/somedb1')
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234/somedb2?readPreference=nearest',
      )
    })
  })

  describe('connect', function () {
    it('should set readyState to 1 when connected', async function () {
      const datastore = new DataStore()

      await datastore.connect()
      datastore.readyState.should.be.eql(1)
    })

    it('should assign Db to the database property', function () {
      this.skip()

      // MongoClient@6.8 does not implement EventEmitter, and in any case should not be exposed unnecessarily
      // https://mongodb.github.io/node-mongodb-native/6.8/classes/Db.html

      // const datastore = new DataStore()

      // datastore
      //   .connect()
      //   .then(() => {
      //     datastore.database.should.be.an.instanceOf(EventEmitter)
      //     done()
      //   })
      //   .catch((err) => {
      //     console.log(err)
      //   })
    })

    it('should reject when connecting with invalid credentials', async function () {
      const newDatabases = JSON.parse(JSON.stringify(DATABASES_NO_DEFAULT))

      newDatabases[0].default = true

      const restoreConfig = await helper.setConfig({
        databases: newDatabases,
        hosts: [{host: '127.0.0.1', port: 27017}],
      })

      try {
        const datastore = new DataStore()

        await datastore.connect()
      } catch (err) {
        should.exist(err)
        err.message.should.eql('Authentication failed.')
      } finally {
        await restoreConfig()
      }
    })

    it('should listen to database-specific environment variables', async function () {
      /** @todo This test seems to be incomplete */
      process.env.DB_1_HOST = '127.0.0.1:27017'

      loadConfig()

      const datastore = new DataStore()

      await datastore.connect()

      delete process.env.DB_1_HOST
    })

    it("should reject when connection can't be established", async function () {
      const newDatabases = JSON.parse(JSON.stringify(DATABASES_NO_DEFAULT))

      newDatabases[2].default = true

      const restoreConfig = await helper.setConfig({
        databases: newDatabases,
      })

      try {
        const datastore = new DataStore()

        await datastore.connect()
      } catch (err) {
        should.exist(err)
      } finally {
        await restoreConfig()
      }
    })

    it("should reject when replicaSet servers can't be found", async function () {
      const newDatabases = JSON.parse(JSON.stringify(DATABASES_NO_DEFAULT))

      newDatabases[3].default = true

      const restoreConfig = await helper.setConfig({
        databases: newDatabases,
        hosts: [{host: '127.0.0.1', port: 27017}],
      })

      const datastore = new DataStore()
      /** @todo spy not used due to private properties - investigate other application */
      // const spy = sinon.spy(datastore._mongoClient, 'connect')

      try {
        await datastore.connect()
      } catch (err) {
        should.exist(err)
        err.should.be.Error

        // spy
        //   .getCall(0)
        //   .args[0].should.eql(
        //     'mongodb://127.0.0.1:27017/replicadb?replicaSet=rs0',
        //   )
        // spy.restore()
      } finally {
        await restoreConfig()
      }
    })
  })

  describe('error states', function () {
    it('`insert` should reject when not connected', async function () {
      const datastore = new DataStore()

      try {
        await datastore.connect({hi: 'there'})
        datastore.readyState = lib.STATE_DISCONNECTED

        await datastore.insert({query: {}, collection: 'testdb', schema: {}})
      } catch (err) {
        should.exist(err)
        err.should.be.Error
        err.message.should.eql('DB_DISCONNECTED')
      }
    })

    it('`update` should reject when not connected', async function () {
      const datastore = new DataStore()

      try {
        await datastore.connect()
        datastore.readyState = lib.STATE_DISCONNECTED

        await datastore.update({query: {}, collection: 'testdb', schema: {}})
      } catch (err) {
        should.exist(err)
        err.should.be.Error
        err.message.should.eql('DB_DISCONNECTED')
      }
    })

    it('`find` should reject when not connected', async function () {
      const datastore = new DataStore()

      try {
        await datastore.connect()
        datastore.readyState = lib.STATE_DISCONNECTED

        await datastore.find({query: {}, collection: 'testdb', schema: {}})
      } catch (err) {
        should.exist(err)
        err.should.be.Error
        err.message.should.eql('DB_DISCONNECTED')
      }
    })

    it('`delete` should reject when not connected', async function () {
      const datastore = new DataStore()

      try {
        await datastore.connect()
        datastore.readyState = lib.STATE_DISCONNECTED

        await datastore.delete({query: {}, collection: 'testdb', schema: {}})
      } catch (err) {
        should.exist(err)
        err.should.be.Error
        err.message.should.eql('DB_DISCONNECTED')
      }
    })

    it('`stats` should reject when not connected', async function () {
      const datastore = new DataStore()

      try {
        await datastore.connect()
        datastore.readyState = lib.STATE_DISCONNECTED

        await datastore.stats('testdb', {})
      } catch (err) {
        should.exist(err)
        err.should.be.Error
        err.message.should.eql('DB_DISCONNECTED')
      }
    })
  })
})
