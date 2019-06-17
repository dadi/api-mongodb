const EventEmitter = require('events').EventEmitter
const MongoDBAdapter = require('../../lib')
const querystring = require('querystring')
const should = require('should')
const url = require('url')

const config = require(__dirname + '/../../config')
const helper = require(__dirname + '/helper')

describe('MongoDB Operations', function () {
  this.timeout(2000)

  beforeEach(() => {
    const mongodb = new MongoDBAdapter()

    return mongodb.connect().then(() => {
      return mongodb.dropDatabase('defaultdb')
    })
  })

  afterEach(function (done) {
    done()
  })

  describe('indexes', function () {
    describe('create index', function () {
      it('should create an index on the specified collection', function (done) {
        let mongodb = new MongoDBAdapter()

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
      it('should return a collections indexes', function (done) {
        let mongodb = new MongoDBAdapter()

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
    it('should insert a single document and return inserted data', function (done) {
      let mongodb = new MongoDBAdapter()

      let doc = {
        fieldName: 'foo'
      }

      mongodb.connect().then(() => {
        mongodb.insert({data: doc, collection: 'test', schema: helper.getModelSchema()}).then(result => {
          result.should.be.Array
          result.length.should.eql(1)
          should.exist(result[0].fieldName)
          should.exist(result[0]._id)
          result[0]._id.should.be.String
          result[0]._id.length.should.eql(24)
          should.equal(Object.keys(result[0]._id).length, 24)
          done()
        }).catch((err) => {
          done(err)
        })
      })
    })

    it('should insert an array of documents and return inserted data', function (done) {
      let mongodb = new MongoDBAdapter()

      let docs = [
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
          should.exist(result[0]._id)

          result[0].fieldName.should.eql('foo')
          result[0]._id.length.should.eql(24)
          result[0]._id.should.be.String
          should.equal(Object.keys(result[0]._id).length, 24)

          result[1].fieldName.should.eql('foo_1')
          result[1]._id.length.should.eql(24)
          result[1]._id.should.be.String
          should.equal(Object.keys(result[1]._id).length, 24)

          done()
        }).catch((err) => {
          done(err)
        })
      })
    })
  })

  describe('stats', function () {
    it('should return stats for the specified collection', function (done) {
      let mongodb = new MongoDBAdapter()

      let doc = { fieldName: 'foo' }

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
    it('should find a single document by id', function (done) {
      let mongodb = new MongoDBAdapter()

      let doc = { fieldName: 'foo' }

      mongodb.connect().then(() => {
        mongodb.insert({data: doc, collection: 'test', schema: helper.getModelSchema()}).then(result => {
          let inserted = result[0]
          mongodb.find({ query: { _id: inserted._id }, collection: 'test', schema: helper.getModelSchema()}).then(result => {
            result.results.should.be.Array
            result.results.length.should.eql(1)
            result.results[0]._id.should.eql(inserted._id)
            result.results[0]._id.length.should.eql(24)
            Object.keys(result.results[0]._id).length.should.eql(24)
            done()
          })
        }).catch((err) => {
          done(err)
        })
      })
    })

    it('should find a single document by query', function (done) {
      let mongodb = new MongoDBAdapter()

      let doc = { fieldName: 'foo' }

      mongodb.connect().then(() => {
        mongodb.insert({data: doc, collection: 'test', schema: helper.getModelSchema()}).then(result => {
          let inserted = result[0]
          mongodb.find({ query: { fieldName: inserted.fieldName }, collection: 'test', schema: helper.getModelSchema()}).then(result => {
            result.results.should.be.Array
            result.results.length.should.eql(1)
            result.results[0]._id.should.eql(inserted._id)
            result.results[0]._id.length.should.eql(24)
            Object.keys(result.results[0]._id).length.should.eql(24)
            done()
          })
        }).catch((err) => {
          done(err)
        })
      })
    })

    it('should translate query using $containsAny', function (done) {
      let mongodb = new MongoDBAdapter()

      let docs = [{ fieldName: 'foo1' }, { fieldName: 'foo2' }]

      mongodb.connect().then(() => {
        mongodb.insert({data: docs, collection: 'test', schema: helper.getModelSchema()}).then(result => {
          mongodb.find({query: { fieldName: { '$containsAny': ['foo1'] } }, collection: 'test', schema: helper.getModelSchema()}).then(result => {
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

    it('should translate query using regular expressions', function (done) {
      let mongodb = new MongoDBAdapter()

      let docs = [{ fieldName: 'foo1' }, { fieldName: 'foo2' }]

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

    it('should return metadata when returning documents', function (done) {
      let mongodb = new MongoDBAdapter()

      let doc = { fieldName: 'foo' }

      mongodb.connect().then(() => {
        mongodb.insert({data: doc, collection: 'test', schema: helper.getModelSchema()}).then(result => {
          let inserted = result[0]
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
      let mongodb = new MongoDBAdapter()

      let docs = [{ fieldName: 'foo1' }, { fieldName: 'foo2' }]

      mongodb.connect().then(() => {
        mongodb.insert({data: docs, collection: 'test', schema: helper.getModelSchema()}).then(result => {
          let query = [
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
      let mongodb = new MongoDBAdapter()
      let docs = []

      for (let i = 0; i < 10; ++i) {
        docs.push({
          field1: ((Math.random() * 10) | 1).toString(),
          field2: (Math.random() * 10) | 1
        })
      }

      mongodb.connect().then(() => {
        mongodb.insert({data: docs, collection: 'test', schema: helper.getExtendedModelSchema()}).then(result => {
          let query = [
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
      let mongodb = new MongoDBAdapter()
      let docs = []

      for (let i = 0; i < 10; ++i) {
        docs.push({
          field1: ((Math.random() * 10) | 1).toString(),
          field2: (Math.random() * 10) | 1
        })
      }

      mongodb.connect().then(() => {
        mongodb.insert({data: docs, collection: 'test', schema: helper.getExtendedModelSchema()}).then(result => {
          let query = [
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
    it('should update a single document by id and return count', function (done) {
      let mongodb = new MongoDBAdapter()

      let doc = {
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

    it('should update many documents by query and return count', function (done) {
      let mongodb = new MongoDBAdapter()

      let docs = [
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
    it('should delete a single document by id and return count', function (done) {
      let mongodb = new MongoDBAdapter()

      let doc = {
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

    it('should delete many documents by query and return count', function (done) {
      let mongodb = new MongoDBAdapter()

      let docs = [
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

  describe.skip('search', function () {
    it('should find records in the search index collection that match a single term being searched for', function (done) {
      let mongodb = new MongoDBAdapter()

      let modelSchema = helper.getModelSchema()
      modelSchema.fieldName.search = {
        weight: 2
      }

      let document = {
        fieldName: 'Beyond the Valley of the Dolls'
      }

      mongodb.connect().then(() => {
        // insert document
        mongodb.insert({data: document, collection: 'test', schema: modelSchema}).then(result => {
          let documentId = result[0]._id

          // insert tokenised words
          let words = [
            { 'word': 'beyond' },
            { 'word': 'valley' },
            { 'word': 'dolls' },
            { 'word': 'second' },
            { 'word': 'third' },
            { 'word': 'escape' }
          ]

          mongodb.insert({data: words, collection: 'words', schema: helper.getWordSchema()}).then(result => {
            let wordId = result.find(word => word.word === 'valley')._id

            // insert search reference document
            let searchDocument = {
              weight: 0.6137056388801094,
              word: wordId.toString(),
              document: documentId.toString()
            }

            mongodb.insert({data: searchDocument, collection: 'testSearch', schema: helper.getSearchSchema()}).then(result => {
              // call search method to get document IDs for retrieval
              mongodb.search({words: [wordId.toString()], collection: 'testSearch', schema: helper.getSearchSchema()}).then(result => {
                result.should.be.instanceOf(Array)
                result.length.should.eql(1)
                result[0]._id.document.should.eql(documentId)
                done()
              })
            }).catch((err) => {
              done(err)
            })
          }).catch((err) => {
            done(err)
          })
        }).catch((err) => {
          done(err)
        })
      })
    })

    it('should find records in the search index collection that match multiple terms being searched for', function (done) {
      let mongodb = new MongoDBAdapter()

      let modelSchema = helper.getModelSchema()
      modelSchema.fieldName.search = {
        weight: 2
      }

      let documents = [
        {
          fieldName: 'Beyond the Valley of the Dolls'
        },
        {
          fieldName: 'Escape from the Valley'
        },
        {
          fieldName: 'The Dolls House'
        }
      ]

      mongodb.connect().then(() => {
        // insert document
        mongodb.insert({data: documents, collection: 'test', schema: modelSchema}).then(result => {
          let insertedDocuments = result

          // insert tokenised words
          let words = [
            { 'word': 'beyond' },
            { 'word': 'valley' },
            { 'word': 'dolls' },
            { 'word': 'second' },
            { 'word': 'third' },
            { 'word': 'escape' },
            { 'word': 'house' },
            { 'word': 'from' }
          ]

          mongodb.insert({data: words, collection: 'words', schema: helper.getWordSchema()}).then(insertedWords => {
            // insert search reference document
            let searchDocuments = [
              {
                weight: 0.6137056388801094,
                word: insertedWords.find(word => word.word === 'valley')._id,
                document: documents.find(document => document.fieldName === 'Beyond the Valley of the Dolls')._id
              },
              {
                weight: 0.6137056388801094,
                word: insertedWords.find(word => word.word === 'dolls')._id,
                document: documents.find(document => document.fieldName === 'Beyond the Valley of the Dolls')._id
              },
              {
                weight: 0.6137056388801094,
                word: insertedWords.find(word => word.word === 'beyond')._id,
                document: documents.find(document => document.fieldName === 'Beyond the Valley of the Dolls')._id
              },
              {
                weight: 0.6137056388801094,
                word: insertedWords.find(word => word.word === 'valley')._id,
                document: documents.find(document => document.fieldName === 'Escape from the Valley')._id
              },
              {
                weight: 0.6137056388801094,
                word: insertedWords.find(word => word.word === 'escape')._id,
                document: documents.find(document => document.fieldName === 'Escape from the Valley')._id
              },
              {
                weight: 0.6137056388801094,
                word: insertedWords.find(word => word.word === 'dolls')._id,
                document: documents.find(document => document.fieldName === 'The Dolls House')._id
              },
              {
                weight: 0.6137056388801094,
                word: insertedWords.find(word => word.word === 'house')._id,
                document: documents.find(document => document.fieldName === 'The Dolls House')._id
              }
            ]

            mongodb.insert({data: searchDocuments, collection: 'testSearch', schema: helper.getSearchSchema()}).then(result => {
              // call search method to get document IDs for retrieval
              let query = [insertedWords.find(word => word.word === 'dolls')._id, insertedWords.find(word => word.word === 'house')._id]

              mongodb.search({words: query, collection: 'testSearch', schema: helper.getSearchSchema()}).then(result => {
                result.should.be.instanceOf(Array)
                result.length.should.eql(2)

                function getDocumentId (title) {
                  return insertedDocuments.find(document => document.fieldName === title)._id
                }

                let documentId1 = getDocumentId('The Dolls House')
                let documentId2 = getDocumentId('Beyond the Valley of the Dolls')

                should.exist(result.find(document => document._id.document === documentId1))
                should.exist(result.find(document => document._id.document === documentId2))
                done()
              })
            }).catch((err) => {
              done(err)
            })
          }).catch((err) => {
            done(err)
          })
        }).catch((err) => {
          done(err)
        })
      })
    })
  })
})
