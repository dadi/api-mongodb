var EventEmitter = require('events').EventEmitter
var MongoDBAdapter = require('../../lib')
var querystring = require('querystring')
var should = require('should')
var url = require('url')

var config = require(__dirname + '/../../config')

describe('MongoDB Connection', function () {
  this.timeout(2000)

  beforeEach(function (done) {
      // connection.resetConnections();
    done()
  })

  afterEach(function (done) {
    done()
  })

  describe('connection options', function () {
    it('should use specified database if enableCollectionDatabases == true and database config exists', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.config.enableCollectionDatabases = true
      var connectionOptions = mongodb.getConnectionOptions({ database: 'secondary' })
      var connectionString = mongodb.constructConnectionString(connectionOptions)

      connectionOptions.database.should.eql('secondary')
      connectionString.indexOf('secondary').should.be.above(0)

      done()
    })

    it('should use original database options if enableCollectionDatabases == true and specified database is not in config', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.config.enableCollectionDatabases = true
      var connectionOptions = mongodb.getConnectionOptions({ database: 'testdb' })
      var connectionString = mongodb.constructConnectionString(connectionOptions)

      connectionOptions.database.should.eql('testdb')
      connectionString.indexOf('testdb').should.be.above(0)

      done()
    })

    it('should use original database options if enableCollectionDatabases == false and specified database is in config', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.config.enableCollectionDatabases = false
      var connectionOptions = mongodb.getConnectionOptions({ database: 'secondary' })
      var connectionString = mongodb.constructConnectionString(connectionOptions)

      connectionOptions.database.should.eql('testdb')
      connectionString.indexOf('testdb').should.be.above(0)
      done()
    })
  })

  describe('hosts', function () {
    it('should return hosts array as a string', function (done) {
      var mongodb = new MongoDBAdapter()
      var hosts = mongodb.hosts([{ host: '127.0.0.1', port: 27017 }, { host: '127.0.0.1', port: 27018 }])
      hosts.should.eql('127.0.0.1:27017,127.0.0.1:27018')
      done()
    })
  })

  describe('credentials', function () {
    it('should return credential as a string', function (done) {
      var mongodb = new MongoDBAdapter()
      var credentials = mongodb.credentials({ username: 'testuser', password: 'test123' })
      credentials.should.eql('testuser:test123@')
      done()
    })
  })

  describe('encode options', function () {
    it('should return database options as a querystring', function (done) {
      var mongodb = new MongoDBAdapter()
      var options = mongodb.encodeOptions({ replicaSet: 'test', ssl: false })
      options.should.eql('?replicaSet=test&ssl=false')
      done()
    })
  })

  describe('connection string', function () {
    it('should construct a valid MongoDB connection string', function (done) {
      var mongodb = new MongoDBAdapter()
      var connectionString = mongodb.constructConnectionString(mongodb.config)
      var parts = url.parse(connectionString)

      parts.protocol.should.eql('mongodb:')
      parts.host.should.eql('127.0.0.1:27017')
      parts.hostname.should.eql('127.0.0.1')
      parts.port.should.eql('27017')
      parts.pathname.should.eql('/testdb')
      done()
    })

    it('should add a default readPreference option "secondaryPreferred"', function (done) {
      var mongodb = new MongoDBAdapter()
      var connectionString = mongodb.constructConnectionString(mongodb.config)
      var parts = url.parse(connectionString)

      parts.query.should.eql('readPreference=secondaryPreferred')
      done()
    })

    it('should add a specified readPreference option', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.config.readPreference = 'primary'
      var connectionString = mongodb.constructConnectionString(mongodb.config)
      var parts = url.parse(connectionString)

      parts.query.should.eql('readPreference=primary')
      done()
    })

    it('should add authMechanism and authSource if username and password are specified', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.config.username = 'test'
      mongodb.config.password = 'test123'
      var connectionString = mongodb.constructConnectionString(mongodb.config)
      var parts = url.parse(connectionString)
      parts.query.indexOf('authMechanism').should.be.above(-1)
      done()
    })

    it('should add all specified options', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.config.ssl = true
      mongodb.config.replicaSet = 'repl-01'
      mongodb.config.maxPoolSize = 1
      var connectionString = mongodb.constructConnectionString(mongodb.config)
      var parts = url.parse(connectionString)

      querystring.parse(parts.query).ssl.should.eql('true')
      querystring.parse(parts.query).maxPoolSize.should.eql('1')
      querystring.parse(parts.query).replicaSet.should.eql('repl-01')
      querystring.parse(parts.query).readPreference.should.eql('secondaryPreferred')
      done()
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

    it.skip('should connect with credentials', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.config.username = 'test'
      mongodb.config.password = 'test123'

      mongodb.connect().then(() => {
      }).catch((err) => {
        should.exist(err)
        console.log(err)
        done()
      })
    })

    it('should reject when connecting with invalid credentials', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.config.username = 'test'
      mongodb.config.password = 'test123'

      mongodb.connect().then(() => {
      }).catch((err) => {
        should.exist(err)
        err.message.should.eql('Authentication failed.')
        done()
      })
    })

    it('should reject when connection can\'t be established', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.config.hosts[0].port = 27018
      mongodb.connect().then(() => {
      }).catch((err) => {
        should.exist(err)
        done()
      })
    })

    it('should reject when replicaSet servers can\'t be found', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.config.replicaSet = 'test'
      mongodb.connect().then(() => {
      }).catch((err) => {
        should.exist(err)
        err.toString().should.eql('MongoError: no primary found in replicaset')
        mongodb.connectionString.should.eql('mongodb://127.0.0.1:27017/testdb?replicaSet=test&readPreference=secondaryPreferred')
        done()
      })
    })
  })
})
