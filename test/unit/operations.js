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

  describe('indexes', function () {
    describe('create index', function () {
      it('should create an index on the specified collection', function(done) {
        var mongodb = new MongoDBAdapter()

        let indexes = [
          {
            keys: ['fieldName'],
            options: {}
          }
        ]

        mongodb.connect().then(() => {
          mongodb.index('test', indexes).then(result => {
            result.should.be.Array
            result.length.should.eql(1)
            should.exist(result[0].index)
            result[0].index.should.eql('fieldName_1')

            done()
          }).catch((err) => {
            done(err)
          })
        })
      })
    })

    describe('get index', function () {
      it('should return a collections indexes', function(done) {
        var mongodb = new MongoDBAdapter()

        let indexes = [
          {
            keys: ['fieldName'],
            options: {}
          }
        ]

        mongodb.connect().then(() => {
          mongodb.index('test', indexes).then(result => {
            mongodb.getIndexes('test').then(result => {

/*
[ { v: 1, key: { _id: 1 }, name: '_id_', ns: 'testdb.test' },
  { v: 1,
    key: { fieldName: 1 },
    name: 'fieldName_1',
    ns: 'testdb.test' } ]
*/

              result.should.be.Array
              result.length.should.be.above(0)
              should.exist(result[0].name)
              done()
            })
          }).catch(err => {
            done(err)
          })
        })
      })
    })
  })

  describe('insert', function () {
    it('should insert a single document and return inserted data', function(done) {
      var mongodb = new MongoDBAdapter()

      var doc = {
        fieldName: 'foo'
      }

      mongodb.connect().then(() => {
        mongodb.insert({data: doc, collection: 'test', schema: helper.getModelSchema()}).then(result => {
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
        mongodb.insert({data: docs, collection: 'test', schema: helper.getModelSchema()}).then(result => {
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

  describe('stats', function () {
    it('should return stats for the specified collection', function(done) {
      var mongodb = new MongoDBAdapter()

      var doc = { fieldName: 'foo' }

      mongodb.connect().then(() => {
        mongodb.insert({data: doc, collection: 'test', schema: helper.getModelSchema()}).then(result => {
          mongodb.stats('test', {}).then(result => {
            should.exist(result.count)
            result.count.should.eql(1)
            done()
          })
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
        mongodb.insert({data: doc, collection: 'test', schema: helper.getModelSchema()}).then(result => {
          var inserted = result[0]
          mongodb.find({ query: { _id: inserted._id }, collection: 'test', schema: helper.getModelSchema()}).then(result => {
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
        mongodb.insert({data: doc, collection: 'test', schema: helper.getModelSchema()}).then(result => {
          var inserted = result[0]
          mongodb.find({ query: { fieldName: inserted.fieldName }, collection: 'test', schema:  helper.getModelSchema()}).then(result => {
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

    it('should translate query using $containsAny', function(done) {
      var mongodb = new MongoDBAdapter()

      var docs = [{ fieldName: 'foo1' }, { fieldName: 'foo2' }]

      mongodb.connect().then(() => {
        mongodb.insert({data: docs, collection: 'test', schema: helper.getModelSchema()}).then(result => {
          mongodb.find({query: { fieldName: { '$containsAny': ['foo1'] } }, collection: 'test', schema:  helper.getModelSchema()}).then(result => {
            result.results.should.be.Array
            result.results.length.should.eql(1)
            result.results[0].fieldName.should.eql('foo1')
            done()
          })
        }).catch((err) => {
          done(err)
        })
      })
    })

    it('should translate query using regular expressions', function(done) {
      var mongodb = new MongoDBAdapter()

      var docs = [{ fieldName: 'foo1' }, { fieldName: 'foo2' }]

      mongodb.connect().then(() => {
        mongodb.insert({data: docs, collection: 'test', schema: helper.getModelSchema()}).then(result => {
          mongodb.find({query: { fieldName: /foo1/ }, collection: 'test', schema: helper.getModelSchema()}).then(result => {
            result.results.should.be.Array
            result.results.length.should.eql(1)
            result.results[0].fieldName.should.eql('foo1')
            done()
          })
        }).catch((err) => {
          done(err)
        })
      })
    })

    it('should return metadata when returning documents', function(done) {
      var mongodb = new MongoDBAdapter()

      var doc = { fieldName: 'foo' }

      mongodb.connect().then(() => {
        mongodb.insert({data: doc, collection: 'test', schema: helper.getModelSchema()}).then(result => {
          var inserted = result[0]
          mongodb.find({ query: { fieldName: inserted.fieldName }, collection: 'test', schema: helper.getModelSchema()}).then(result => {
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
        mongodb.insert({data: docs, collection: 'test', schema: helper.getModelSchema()}).then(result => {

          var query = [
            { $match: { fieldName: 'foo1' } }
          ]

          mongodb.find({query: query, collection: 'test', schema: helper.getModelSchema()}).then(result => {
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
        mongodb.insert({data: docs, collection: 'test', schema: helper.getExtendedModelSchema()}).then(result => {

          var query = [
            {
              $group: {
                _id: null,
                averageNumber: { $avg: '$field2' },
                count: { $sum: 1 }
              }
            }
          ]

          mongodb.find({query: query, collection: 'test', schema: helper.getExtendedModelSchema()}).then(result => {
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
        mongodb.insert({data: docs, collection: 'test', schema: helper.getExtendedModelSchema()}).then(result => {

          var query = [
            { $match: { 'field2': { '$gte': 1 } } },
            { $limit: 2 }
          ]

          mongodb.find({query: query, collection: 'test', schema: helper.getExtendedModelSchema()}).then(result => {
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

  describe('update', function () {
    it('should update a single document by id and return count', function(done) {
      var mongodb = new MongoDBAdapter()

      var doc = {
        fieldName: 'foo'
      }

      mongodb.connect().then(() => {
        mongodb.insert({data: doc, collection: 'test', schema: helper.getModelSchema()}).then(result => {
          let id = result[0]._id
          let update = { '$set': { fieldName: 'fooXX' } }

          mongodb.update({query: { _id: id }, collection: 'test', update: update, options: { multi: false }, schema: helper.getModelSchema()}).then(result => {
            should.exist(result.matchedCount)
            result.matchedCount.should.eql(1)

            done()
          })
        }).catch((err) => {
          done(err)
        })
      })
    })

    it('should update many documents by query and return count', function(done) {
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
        mongodb.insert({data: docs, collection: 'test', schema: helper.getModelSchema()}).then(result => {
          let id = result[0]._id
          let query = { fieldName: { '$regex': '^foo' } }

          mongodb.update({query: query, collection: 'test', update: { '$set': { fieldName: 'xxx' } }, schema: helper.getModelSchema()}).then(result => {
            should.exist(result.matchedCount)
            result.matchedCount.should.eql(2)

            done()
          })
        }).catch((err) => {
          done(err)
        })
      })
    })
  })

  describe('delete', function () {
    it('should delete a single document by id and return count', function(done) {
      var mongodb = new MongoDBAdapter()

      var doc = {
        fieldName: 'foo'
      }

      mongodb.connect().then(() => {
        mongodb.insert({data: doc, collection: 'test', schema: helper.getModelSchema()}).then(result => {
          let id = result[0]._id
          let update = { '$set': { fieldName: 'fooXX' } }

          mongodb.delete({query: { _id: id }, collection: 'test', schema: helper.getModelSchema()}).then(result => {
            should.exist(result.deletedCount)
            result.deletedCount.should.eql(1)

            done()
          })
        }).catch((err) => {
          done(err)
        })
      })
    })

    it('should delete many documents by query and return count', function(done) {
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
        mongodb.insert({data: docs, collection: 'test', schema: helper.getModelSchema()}).then(result => {
          let id = result[0]._id
          let query = { fieldName: { '$regex': '^foo' } }

          mongodb.delete({ query: query, collection: 'test', schema: helper.getModelSchema()}).then(result => {
            should.exist(result.deletedCount)
            result.deletedCount.should.eql(2)

            done()
          })
        }).catch((err) => {
          done(err)
        })
      })
    })
  })
})
