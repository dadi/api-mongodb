var EventEmitter = require('events').EventEmitter
var MongoDBAdapter = require('../../lib')
var querystring = require('querystring')
var should = require('should')
var url = require('url')

var config = require(__dirname + '/../../config')
var helper = require(__dirname + '/helper')

describe('MongoDB', function () {
  this.timeout(2000)

  beforeEach(function (done) {
      // connection.resetConnections();
    done()
  })

  afterEach(function (done) {
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

  describe('query utils', function () {
    describe('encodeOptions', function () {
      it('should return empty string if options is empty', function (done) {
        new MongoDBAdapter().encodeOptions({}).should.eql('')
        done()
      })
    })

    describe('hosts', function () {
      it('should construct a host string from array', function (done) {
        new MongoDBAdapter().hosts([{host: '127.0.0.1', port: 3000 }, {host: '127.0.0.2' }]).should.eql('127.0.0.1:3000,127.0.0.2:27017')
        done()
      })
    })

    describe('convertObjectIdsForSave', function () {
      it('should be a method', function (done) {
        new MongoDBAdapter().convertObjectIdsForSave.should.be.Function
        done()
      })

      it('should accept schema and object and replace ObjectIDs in array', function (done) {
        var fields = helper.getModelSchema()
        var schema = {}
        schema.fields = fields

        schema.fields.field2 = Object.assign({}, schema.fields.fieldName, {
          type: 'ObjectID',
          required: false
        })

        var mongodb = new MongoDBAdapter()
        var obj = {fieldName: 'Hello', field2: ['55cb1658341a0a804d4dadcc'] }
        obj = mongodb.convertObjectIdsForSave(obj, schema.fields)

        var t = typeof obj.field2[0]
        t.should.eql('object')

        done()
      })

      it('should accept schema and object and replace ObjectIDs as single value', function (done) {
        var fields = helper.getModelSchema()
        var schema = {}
        schema.fields = fields

        schema.fields.field2 = Object.assign({}, schema.fields.fieldName, {
          type: 'ObjectID',
          required: false
        })

        var mongodb = new MongoDBAdapter()
        var obj = {fieldName: 'Hello', field2: '55cb1658341a0a804d4dadcc' }
        obj = mongodb.convertObjectIdsForSave(obj, schema.fields)

        var t = typeof obj.field2
        t.should.eql('object')

        done()
      })
    })

    // Query Utils `createObjectIdFromString` method should:
    //   convert Strings to ObjectIDs when a field type is ObjectID
    //   allow $in query to convert Strings to ObjectIDs for Reference fields
    //   not convert (sub query) Strings to ObjectIDs when a field type is Object
    //   not convert (dot notation) Strings to ObjectIDs when a field type is Object
    describe('`createObjectIdFromString` method', function () {
      it('should convert Strings to ObjectIDs when a field type is ObjectID', function (done) {
        var fields = helper.getModelSchema()
        var schema = {}
        schema.fields = fields

        schema.fields.field2 = Object.assign({}, schema.fields.fieldName, {
          type: 'ObjectID',
          required: false
        })

        var query = { 'field2': '55cb1658341a0a804d4dadcc' }

        var mongodb = new MongoDBAdapter()
        query = mongodb.createObjectIdFromString(query, schema.fields)

        var type = typeof query.field2
        type.should.eql('object')

        done()
      })

      it('should allow $in query to convert Strings to ObjectIDs for Reference fields', function (done) {
        var fields = helper.getModelSchema()
        var schema = {}
        schema.fields = fields

        schema.fields.field2 = Object.assign({}, schema.fields.fieldName, {
          type: 'Reference',
          required: false
        })

        var query = { 'field2': { '$in': ['55cb1658341a0a804d4dadcc'] } }

        var mongodb = new MongoDBAdapter()
        query = mongodb.createObjectIdFromString(query, schema.fields)

        var type = typeof query.field2
        type.should.eql('object')

        done()
      })

      it('should not convert (sub query) Strings to ObjectIDs when a field type is Object', function (done) {
        var fields = helper.getModelSchema()
        var schema = {}
        schema.fields = fields

        schema.fields.field2 = Object.assign({}, schema.fields.fieldName, {
          type: 'ObjectID',
          required: false
        })

        schema.fields.field3 = Object.assign({}, schema.fields.fieldName, {
          type: 'Object',
          required: false
        })

        var query = { 'field3': {'id': '55cb1658341a0a804d4dadcc' }}

        var mongodb = new MongoDBAdapter()
        query = mongodb.createObjectIdFromString(query, schema.fields)

        var type = typeof query.field3.id
        type.should.eql('string')

        done()
      })

      it('should not convert (dot notation) Strings to ObjectIDs when a field type is Object', function (done) {
        var fields = helper.getModelSchema()
        var schema = {}
        schema.fields = fields

        schema.fields.field2 = Object.assign({}, schema.fields.fieldName, {
          type: 'ObjectID',
          required: false
        })

        schema.fields.field3 = Object.assign({}, schema.fields.fieldName, {
          type: 'Object',
          required: false
        })

        var query = { 'field3.id': '55cb1658341a0a804d4dadcc' }

        var mongodb = new MongoDBAdapter()
        query = mongodb.createObjectIdFromString(query, schema.fields)

        var type = typeof query[Object.keys(query)[0]]
        type.should.eql('string')

        done()
      })
    })
  })
})
