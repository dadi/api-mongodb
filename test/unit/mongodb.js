var EventEmitter = require('events').EventEmitter
var MongoDBAdapter = require('../../lib')
var querystring = require('querystring')
var should = require('should')
var url = require('url')

var config = require(__dirname + '/../../config')

describe('MongoDB', function () {
  this.timeout(2000)

  beforeEach(function (done) {
      // connection.resetConnections();
    done()
  })

  afterEach(function(done) {
    done()
  })

  describe('constructor', function () {
    it('should be exposed', function (done) {
      MongoDBAdapter.should.be.Function
      done()
    })

    it('should inherit from EventEmitter', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.should.be.an.instanceOf(EventEmitter)
      mongodb.emit.should.be.Function
      done()
    })

    it('should load config if no options supplied', function (done) {
      var mongodb = new MongoDBAdapter()
      should.exist(mongodb.config)
      mongodb.config.database.should.eql('testdb')
      done()
    })

    it('should load config from options supplied', function (done) {
      var mongodb = new MongoDBAdapter({ database: 'xx' })
      should.exist(mongodb.config)
      mongodb.config.database.should.eql('xx')
      done()
    })

    it('should have readyState == 0 when initialised', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.readyState.should.eql(0)
      done()
    })
  })

  describe('connection options', function () {
    it('should use specified database if enableCollectionDatabases == true and database config exists', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.config.enableCollectionDatabases = true
      var connectionOptions = mongodb.getConnectionOptions({ database: 'secondary' })
      connectionOptions.database.should.eql('secondary')
      done()
    })

    it('should use original database options if enableCollectionDatabases == true and specified database is not in config', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.config.enableCollectionDatabases = true
      var connectionOptions = mongodb.getConnectionOptions({ database: 'xx' })
      connectionOptions.database.should.eql('testdb')
      done()
    })

    it('should use original database options if enableCollectionDatabases == false and specified database is in config', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.config.enableCollectionDatabases = false
      var connectionOptions = mongodb.getConnectionOptions({ database: 'secondary' })
      connectionOptions.database.should.eql('testdb')
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
      parts.port.should.eql(27017)
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

    it('should add all specified options', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.config.ssl = true
      mongodb.config.replicaSet = 'repl-01'
      mongodb.config.maxPoolSize = 1
      var connectionString = mongodb.constructConnectionString(mongodb.config)
      var parts = url.parse(connectionString)

      querystring.parse(parts.query).ssl.should.eql('true')
      querystring.parse(parts.query).maxPoolSize.should.eql(1)
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

    it('should reject when connection can\'t be established', function (done) {
      var mongodb = new MongoDBAdapter()
      mongodb.config.hosts[0].port = 27018
      mongodb.connect().then(() => {
      }).catch((err) => {
        should.exist(err)
        done()
      })
    })
  })

  // it.skip('should connect once to database', function (done) {
  //   var options = {
  //     'username': '',
  //     'password': '',
  //     'database': 'testdb',
  //     'replicaSet': '',
  //     'hosts': [
  //       {
  //         'host': '127.0.0.1',
  //         'port': 27017
  //       }
  //     ]
  //   }
  //
  //   var dbTag
  //
  //   var conn1 = connection(options)
  //   setTimeout(function () {
  //     conn.db.constructor.name.should.eql('DataStore')
  //     conn1.readyState.should.equal(1)
  //     conn1.datastore.connectionString.should.eql('mongodb://127.0.0.1:27017/test?maxPoolSize=1')
  //         // dbTag = conn1.db.tag;
  //   }, 500)
  //
  //   var conn2 = connection(options)
  //   setTimeout(function () {
  //     conn.db.constructor.name.should.eql('DataStore')
  //     conn2.readyState.should.equal(1)
  //     conn2.datastore.connectionString.should.eql('mongodb://127.0.0.1:27017/test?maxPoolSize=1')
  //         // conn2.db.tag.should.eql(dbTag);
  //     done()
  //   }, 500)
  // })
  //
  // it('should connect with credentials', function (done) {
  //   help.addUserToDb({
  //     username: 'test',
  //     password: 'test123'
  //   }, {
  //     databaseName: 'testdb',
  //     host: '127.0.0.1',
  //     port: 27017
  //   }, function (err) {
  //     if (err) return done(err)
  //
  //     var conn = connection({
  //       auth: true,
  //       username: 'test',
  //       password: 'test123',
  //       database: 'testdb',
  //       hosts: [{
  //         host: '127.0.0.1',
  //         port: 27017
  //       }],
  //       replicaSet: ''
  //     })
  //
  //     setTimeout(function () {
  //       conn.db.constructor.name.should.eql('DataStore')
  //       conn.readyState.should.equal(1)
  //       done()
  //     }, 500)
  //   })
  // })
  //
  // it('should emit error if authentication fails when connecting with credentials', function (done) {
  //   help.addUserToDb({
  //     username: 'test',
  //     password: 'test123'
  //   }, {
  //     databaseName: 'testdb',
  //     host: '127.0.0.1',
  //     port: 27017
  //   }, function (err) {
  //     if (err) return done(err)
  //
  //     var conn = connection({
  //       auth: true,
  //       username: 'test',
  //       password: 'test123x',
  //       database: 'testdb',
  //       hosts: [{
  //         host: '127.0.0.1',
  //         port: 27017
  //       }],
  //       replicaSet: ''
  //     })
  //
  //     conn.on('error', (err) => {
  //       err.message.should.eql('Authentication failed.')
  //       conn.readyState.should.equal(0)
  //       done()
  //     })
  //   })
  // })
  //
  // it('should construct a valid replica set connection string', function (done) {
  //   help.addUserToDb({
  //     username: 'test',
  //     password: 'test123'
  //   }, {
  //     databaseName: 'testdb',
  //     host: 'localhost',
  //     port: 27017
  //   }, function (err) {
  //     if (err) return done(err)
  //
  //     var configOptions = {
  //       'testdb': {
  //         'hosts': [
  //           {
  //             'host': '127.0.0.1',
  //             'port': 27016
  //           },
  //           {
  //             'host': '127.0.0.1',
  //             'port': 27017
  //           },
  //           {
  //             'host': '127.0.0.1',
  //             'port': 27018
  //           }
  //         ]
  //       }
  //     }
  //
  //     var connectOptions = {
  //       'username': 'test',
  //       'password': 'test123',
  //       'database': 'testdb',
  //       'replicaSet': 'repl-01',
  //       'maxPoolSize': 1
  //     }
  //
  //     TestHelper.updateConfig('mongodb', configOptions).then(() => {
  //       var conn = connection(connectOptions)
  //
  //       setTimeout(function() {
  //         //TestHelper.resetConfig('mongodb').then(() => {
  //         conn.datastore.connectionString.should.eql('mongodb://test:test123@127.0.0.1:27016,127.0.0.1:27017,127.0.0.1:27018/testdb?replicaSet=repl-01&maxPoolSize=1&readPreference=secondaryPreferred')
  //         done()
  //         //})
  //       }, 1000)
  //     })
  //   })
  // })
  //
  //
  // it('should raise error when replicaSet servers can\'t be found', function (done) {
  //   help.addUserToDb({
  //     username: 'test',
  //     password: 'test123'
  //   }, {
  //     databaseName: 'test',
  //     host: 'localhost',
  //     port: 27017
  //   }, function (err) {
  //     if (err) return done(err)
  //
  //     var options = {
  //       'username': 'test',
  //       'password': 'test123',
  //       'database': 'testdb',
  //       'replicaSet': 'test',
  //       'maxPoolSize': 1,
  //       'hosts': [
  //         {
  //           'host': '127.0.0.1',
  //           'port': 27016
  //         }
  //       ]
  //     }
  //
  //     var conn = connection(options)
  //
  //     conn.on('error', function (err) {
  //       conn.datastore.connectionString.should.eql('mongodb://test:test123@127.0.0.1:27016/test?replicaSet=test&maxPoolSize=1')
  //       err.toString().should.eql('MongoError: no primary found in replicaset')
  //       done()
  //     })
  //   })
//  })
})
