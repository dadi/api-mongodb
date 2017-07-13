var _ = require('underscore')
var EventEmitter = require('events').EventEmitter
var MongoDBAdapter = require('../../lib')
var querystring = require('querystring')
var should = require('should')
var url = require('url')

var config = require(__dirname + '/../../config')
var helper = require(__dirname + '/helper')

describe('MongoDB Operations', function () {
  this.timeout(2000)

  beforeEach(function (done) {
    var mongodb = new MongoDBAdapter()
    mongodb.connect().then(() => {
      mongodb.dropDatabase('testdb').then(() => {
        done()
      })
    }).catch((err) => {
      done(err)
    })
  })

  afterEach(function(done) {
    done()
  })

  describe('insert', function () {
    it('should insert a single document and return inserted data', function(done) {
      var mongodb = new MongoDBAdapter()

      var doc = {
        fieldName: 'foo'
      }

      mongodb.connect().then(() => {
        mongodb.insert(doc, 'test', helper.getModelSchema()).then(result => {
          result.should.be.Array
          result.length.should.eql(1)
          should.exist(result[0].fieldName)
          should.exist(result[0]._id);

          (typeof result[0]._id).should.eql('object')
          done()
        }).catch((err) => {
          done(err)
        })
      })
    })

    it('should insert an array of documents and return inserted data', function(done) {
      var mongodb = new MongoDBAdapter()

      var docs = [
        {
          fieldName: 'foo'
        },
        {
          fieldName: 'foo_1'
        }
      ]

      mongodb.connect().then(() => {
        mongodb.insert(docs, 'test', helper.getModelSchema()).then(result => {
          result.should.be.Array
          result.length.should.eql(2)
          should.exist(result[0].fieldName)
          should.exist(result[0]._id);

          (typeof result[0]._id).should.eql('object')

          result[0].fieldName.should.eql('foo')
          result[1].fieldName.should.eql('foo_1')
          done()
        }).catch((err) => {
          done(err)
        })
      })
    })
  })

  describe('find', function () {
    it('should find a single document by id', function(done) {
      var mongodb = new MongoDBAdapter()

      var doc = { fieldName: 'foo' }

      mongodb.connect().then(() => {
        mongodb.insert(doc, 'test', helper.getModelSchema()).then(result => {
          var inserted = result[0]
          mongodb.find({ _id: inserted._id }, 'test', {}, helper.getModelSchema()).then(result => {
            result.results.should.be.Array
            result.results.length.should.eql(1)
            result.results[0]._id.should.eql(inserted._id)
            done()
          })
        }).catch((err) => {
          done(err)
        })
      })
    })

    it('should find a single document by query', function(done) {
      var mongodb = new MongoDBAdapter()

      var doc = { fieldName: 'foo' }

      mongodb.connect().then(() => {
        mongodb.insert(doc, 'test', helper.getModelSchema()).then(result => {
          var inserted = result[0]
          mongodb.find({ fieldName: inserted.fieldName }, 'test', {}, helper.getModelSchema()).then(result => {
            result.results.should.be.Array
            result.results.length.should.eql(1)
            result.results[0]._id.should.eql(inserted._id)

            should.exist(result.metadata)
            result.metadata.totalCount.should.eql(1)
            done()
          })
        }).catch((err) => {
          done(err)
        })
      })
    })

    it('should perform aggregation query when given a JSON array', function (done) {
      var mongodb = new MongoDBAdapter()

      var docs = [{ fieldName: 'foo1' }, { fieldName: 'foo2' }]

      mongodb.connect().then(() => {
        mongodb.insert(docs, 'test', helper.getModelSchema()).then(result => {

          var query = [
            { $match: { fieldName: 'foo1' } }
          ]

          mongodb.find(query, 'test', {}, helper.getModelSchema()).then(result => {
            result.should.be.Array
            result.length.should.eql(1)
            result[0].fieldName.should.eql('foo1')

            should.not.exist(result.metadata)
            done()
          })
        }).catch((err) => {
          done(err)
        })
      })
    })

    it('should return grouped result set when using $group in an aggregation query', function (done) {
      var mongodb = new MongoDBAdapter()
      var docs = []

      for (var i = 0; i < 10; ++i) {
        docs.push({
          field1: ((Math.random() * 10) | 1).toString(),
          field2: (Math.random() * 10) | 1
        })
      }

      mongodb.connect().then(() => {
        mongodb.insert(docs, 'test', helper.getExtendedModelSchema()).then(result => {

          var query = [
            {
              $group: {
                _id: null,
                averageNumber: { $avg: '$field2' },
                count: { $sum: 1 }
              }
            }
          ]

          mongodb.find(query, 'test', {}, helper.getExtendedModelSchema()).then(result => {
            result.should.be.Array
            result.length.should.equal(1)
            result[0].averageNumber.should.be.above(0)

            should.not.exist(result.metadata)
            done()
          })
        }).catch((err) => {
          done(err)
        })
      })
    })

    it('should return normal result set when only using $match in an aggregation query', function (done) {
      var mongodb = new MongoDBAdapter()
      var docs = []

      for (var i = 0; i < 10; ++i) {
        docs.push({
          field1: ((Math.random() * 10) | 1).toString(),
          field2: (Math.random() * 10) | 1
        })
      }

      mongodb.connect().then(() => {
        mongodb.insert(docs, 'test', helper.getExtendedModelSchema()).then(result => {

          var query = [
            { $match: { 'field2': { '$gte': 1 } } },
            { $limit: 2 }
          ]

          mongodb.find(query, 'test', {}, helper.getExtendedModelSchema()).then(result => {
            result.should.be.Array
            result.length.should.equal(2)
            result[0].field1.should.be.above(0)

            should.not.exist(result.metadata)
            done()
          })
        }).catch((err) => {
          done(err)
        })
      })
    })
  })
})
