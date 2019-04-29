const EventEmitter = require('events').EventEmitter
const MongoDBAdapter = require('../../lib')
const querystring = require('querystring')
const should = require('should')
const sinon = require('sinon')
const url = require('url')

const config = require(__dirname + '/../../config')
const configBackup = config.get()

const DATABASES = {
  authdb: {
    hosts: [
      {host: '127.0.0.1', port: 27017}
    ],
    username: 'johndoe',
    password: 'topsecret'
  }, 
  defaultdb: {
    hosts: [
      {host: '127.0.0.1', port: 27017}
    ]
  },
  invaliddb: {
    hosts: [
      {host: '127.0.0.1', port: 27018}
    ]
  },
  replicadb: {
    hosts: [
      {host: '127.0.0.1', port: 27017}
    ],
    replicaSet: 'rs0'
  },
  somedb: {
    hosts: [
      {host: '123.456.7.8', port: 27017}
    ]
  }
}

describe('MongoDB connection', function () {
  this.timeout(2000)

  afterEach(() => {
    config.set('database', 'defaultdb')
    config.set('databases', DATABASES)
  })

  describe('getDatabaseOptions', function () {
    it('should use block of specified database if it exists and `override` is set to true', () => {
      const mongoDb = new MongoDBAdapter()
      
      config.set('database', 'defaultdb')
      config.set('databases', DATABASES)

      const {name, options} = mongoDb.getDatabaseOptions({
        database: 'somedb',
        override: true
      })

      name.should.eql('somedb')
      options.should.eql(DATABASES.somedb)
    })

    it('should use block of default database if `override` is set to false', () => {
      const mongoDb = new MongoDBAdapter()
      
      config.set('database', 'defaultdb')
      config.set('databases', DATABASES)

      const {name, options} = mongoDb.getDatabaseOptions({
        database: 'somedb',
        override: false
      })

      name.should.eql('defaultdb')
      options.should.eql(DATABASES.defaultdb)
    })

    it('should use top-level database block if there is no entry in the `databases` block', () => {
      const mongoDb = new MongoDBAdapter()
      
      config.set('database', 'defaultdb')
      config.set('databases', {})
      config.set('hosts', DATABASES.defaultdb.hosts)

      const {name, options} = mongoDb.getDatabaseOptions({
        database: 'defaultdb',
        override: false
      })

      name.should.eql('defaultdb')
      options.hosts.should.eql(DATABASES.defaultdb.hosts)
    })
  })

  describe('getConnectionString', function () {
    it('should construct a connection string with all hosts', () => {
      const mongoDb = new MongoDBAdapter()
      const connectionString1 = mongoDb.getConnectionString('somedb1', {
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ]
      })
      const connectionString2 = mongoDb.getConnectionString('somedb2', {
        hosts: [
          {host: '123.456.78.9', port: 1234},
          {host: '321.654.78.9', port: 4321}
        ]
      })

      connectionString1.should.eql(
        'mongodb://123.456.78.9:1234/somedb1'
      )
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234,321.654.78.9:4321/somedb2'
      )
    })

    it('should include username and password if both properties are defined', () => {
      const mongoDb = new MongoDBAdapter()
      const connectionString1 = mongoDb.getConnectionString('somedb1', {
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ],
        username: 'johndoe'
      })
      const connectionString2 = mongoDb.getConnectionString('somedb2', {
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ],
        password: 'whoami'
      })
      const connectionString3 = mongoDb.getConnectionString('somedb3', {
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ],
        username: 'johndoe',
        password: 'whoami'
      })
      const connectionString4 = mongoDb.getConnectionString('somedb4', {
        hosts: [
          {host: '123.456.78.9', port: 1234},
          {host: '321.654.78.9', port: 4321}
        ],
        username: 'johndoe',
        password: 'whoami'
      })

      connectionString1.should.eql(
        'mongodb://123.456.78.9:1234/somedb1'
      )
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234/somedb2'
      )
      connectionString3.should.eql(
        'mongodb://johndoe:whoami@123.456.78.9:1234/somedb3'
      )
      connectionString4.should.eql(
        'mongodb://johndoe:whoami@123.456.78.9:1234,321.654.78.9:4321/somedb4'
      )
    })

    it('should include `authMechanism` when specified, if username and password are set', () => {
      const mongoDb = new MongoDBAdapter()
      const connectionString1 = mongoDb.getConnectionString('somedb1', {
        authMechanism: 'MONGODB-X509',
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ],
        username: 'johndoe'
      })
      const connectionString2 = mongoDb.getConnectionString('somedb2', {
        authMechanism: 'MONGODB-X509',
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ],
        password: 'whoami'
      })
      const connectionString3 = mongoDb.getConnectionString('somedb3', {
        authMechanism: 'MONGODB-X509',
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ],
        username: 'johndoe',
        password: 'whoami'
      })

      connectionString1.should.eql(
        'mongodb://123.456.78.9:1234/somedb1'
      )
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234/somedb2'
      )
      connectionString3.should.eql(
        'mongodb://johndoe:whoami@123.456.78.9:1234/somedb3?authMechanism=MONGODB-X509'
      )
    })

    it('should include `authDatabase` when specified, if username and password are set', () => {
      const mongoDb = new MongoDBAdapter()
      const connectionString1 = mongoDb.getConnectionString('somedb1', {
        authDatabase: 'myauth',
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ],
        username: 'johndoe'
      })
      const connectionString2 = mongoDb.getConnectionString('somedb2', {
        authDatabase: 'myauth',
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ],
        password: 'whoami'
      })
      const connectionString3 = mongoDb.getConnectionString('somedb3', {
        authDatabase: 'myauth',
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ],
        username: 'johndoe',
        password: 'whoami'
      })

      connectionString1.should.eql(
        'mongodb://123.456.78.9:1234/somedb1'
      )
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234/somedb2'
      )
      connectionString3.should.eql(
        'mongodb://johndoe:whoami@123.456.78.9:1234/somedb3?authDatabase=myauth'
      )
    })

    it('should include `ssl` when specified', () => {
      const mongoDb = new MongoDBAdapter()
      const connectionString1 = mongoDb.getConnectionString('somedb1', {
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ]
      })
      const connectionString2 = mongoDb.getConnectionString('somedb2', {
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ],
        ssl: true
      })

      connectionString1.should.eql(
        'mongodb://123.456.78.9:1234/somedb1'
      )
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234/somedb2?ssl=true'
      )
    })

    it('should include `maxPoolSize` when specified', () => {
      const mongoDb = new MongoDBAdapter()
      const connectionString1 = mongoDb.getConnectionString('somedb1', {
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ]
      })
      const connectionString2 = mongoDb.getConnectionString('somedb2', {
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ],
        maxPoolSize: 50
      })

      connectionString1.should.eql(
        'mongodb://123.456.78.9:1234/somedb1'
      )
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234/somedb2?maxPoolSize=50'
      )
    })

    it('should include `replicaSet` when specified', () => {
      const mongoDb = new MongoDBAdapter()
      const connectionString1 = mongoDb.getConnectionString('somedb1', {
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ]
      })
      const connectionString2 = mongoDb.getConnectionString('somedb2', {
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ],
        replicaSet: 'rs0'
      })

      connectionString1.should.eql(
        'mongodb://123.456.78.9:1234/somedb1'
      )
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234/somedb2?replicaSet=rs0'
      )
    })

    it('should include `readPreference` when specified', () => {
      const mongoDb = new MongoDBAdapter()
      const connectionString1 = mongoDb.getConnectionString('somedb1', {
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ]
      })
      const connectionString2 = mongoDb.getConnectionString('somedb2', {
        hosts: [
          {host: '123.456.78.9', port: 1234}
        ],
        readPreference: 'nearest'
      })

      connectionString1.should.eql(
        'mongodb://123.456.78.9:1234/somedb1'
      )
      connectionString2.should.eql(
        'mongodb://123.456.78.9:1234/somedb2?readPreference=nearest'
      )
    })
  })

  describe('connect', function () {
    it('should set readyState to 1 when connected', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.connect().then(() => {
        mongodb.database.should.be.an.instanceOf(EventEmitter)
        done()
      }).catch((err) => {
        console.log(err)
      })
    })

    it('should assign Db to the database property', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.connect().then(() => {
        mongodb.database.should.be.an.instanceOf(EventEmitter)
        done()
      }).catch((err) => {
        console.log(err)
      })
    })

    it('should reject when connecting with invalid credentials', function (done) {
      config.set('database', 'authdb')
      config.set('databases', DATABASES)

      const mongodb = new MongoDBAdapter()

      mongodb.connect().then(() => {
      }).catch((err) => {
        should.exist(err)
        err.message.should.eql('Authentication failed.')
        done()
      })
    })

    it('should reject when connection can\'t be established', function (done) {
      config.set('database', 'invaliddb')
      config.set('databases', DATABASES)
      
      const mongodb = new MongoDBAdapter()

      mongodb.connect().then(() => {
      }).catch((err) => {
        should.exist(err)
        done()
      })
    })

    it('should reject when replicaSet servers can\'t be found', function (done) {
      const mongodb = new MongoDBAdapter()
      const spy = sinon.spy(mongodb._mongoClient, 'connect')

      config.set('database', 'replicadb')
      config.set('databases', DATABASES)
      mongodb.connect().catch((err) => {
        should.exist(err)
        err.should.be.Error

        spy.getCall(0).args[0].should.eql('mongodb://127.0.0.1:27017/replicadb?replicaSet=rs0')

        spy.restore()
        done()
      })
    })
  })

  describe('error states', function () {
    it('`insert` should reject when not connected', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.connect({hi: 'there'}).then(() => {
        console.log('-----> 1')
        mongodb.readyState = 0

        mongodb.insert({query: {}, collection: 'testdb', schema: {}}).then(() => {
          console.log('-----> 2')
        }).catch(err => {
          console.log('-----> 3')
          should.exist(err)
          err.should.be.Error
          err.message.should.eql('DB_DISCONNECTED')
        })
        done()
      }).catch(err => {
        console.log('-----> 4', err)
      })
    })

    it.skip('`update` should reject when not connected', function (done) {
      config.set('database', 'defaultdb')
      config.set('databases', DATABASES)
      
      var mongodb = new MongoDBAdapter()
      mongodb.connect().then(() => {
        mongodb.readyState = 0

        mongodb.update({query: {}, collection: 'testdb', schema: {}}).then(() => {

        }).catch(err => {
          should.exist(err)
          err.should.be.Error
          err.message.should.eql('DB_DISCONNECTED')
        })
        done()
      })
    })

    it.skip('`find` should reject when not connected', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.connect().then(() => {
        mongodb.readyState = 0

        mongodb.find({query: {}, collection: 'testdb', schema: {}}).then(() => {

        }).catch(err => {
          should.exist(err)
          err.should.be.Error
          err.message.should.eql('DB_DISCONNECTED')
        })
        done()
      })
    })

    it.skip('`delete` should reject when not connected', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.connect().then(() => {
        mongodb.readyState = 0

        mongodb.delete({query: {}, collection: 'testdb', schema: {}}).then(() => {

        }).catch(err => {
          should.exist(err)
          err.should.be.Error
          err.message.should.eql('DB_DISCONNECTED')
        })
        done()
      })
    })

    it.skip('`stats` should reject when not connected', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.connect().then(() => {
        mongodb.readyState = 0

        mongodb.stats('testdb', {}).then(() => {

        }).catch(err => {
          should.exist(err)
          err.should.be.Error
          err.message.should.eql('DB_DISCONNECTED')
        })
        done()
      })
    })
  })
})
