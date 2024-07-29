const helper = require('./helper.js')
const {DATABASES} = require('./databases.js')
const DataStore = require('../../lib/index.js')
const should = require('should')
const sinon = require('sinon')

describe('MongoDB Operations', function () {
  this.timeout(2000)

  before(function () {
    helper.setConfig({databases: DATABASES})
  })

  beforeEach(async function () {
    const datastore = new DataStore()

    await datastore.connect()
    await datastore.dropDatabase()
  })

  afterEach(function (done) {
    done()
  })

  describe('indexes', function () {
    describe('create index', function () {
      it('should create an index on the specified collection', async function () {
        const datastore = new DataStore()
        const indexes = [
          {
            keys: ['fieldName'],
            options: {},
          },
        ]

        await datastore.connect()
        const spy = sinon.spy(datastore.database, 'createIndex')

        await datastore.index('test', indexes)
        spy.callCount.should.eql(1)
        spy.getCall(0).args[0].should.eql('test')
        spy.getCall(0).args[1].should.eql(indexes[0].keys)
        spy.getCall(0).args[2].should.eql(indexes[0].options)

        spy.restore()
      })
    })

    describe('get index', function () {
      it('should return a collections indexes', async function () {
        const datastore = new DataStore()

        const indexes = [
          {
            keys: ['fieldName'],
            options: {},
          },
        ]

        await datastore.connect()
        await datastore.index('test', indexes)
        const result = await datastore.getIndexes('test')

        /*
        [
          { v: 1, key: { _id: 1 }, name: '_id_', ns: 'testdb.test' },
          { v: 1, key: { fieldName: 1 }, name: 'fieldName_1', ns: 'testdb.test' }
        ]
        */
        result.should.be.Array()
        result.length.should.be.above(0)
        should.exist(result[0].name)
      })
    })
  })

  describe('insert', function () {
    it('should insert a single document and return inserted data', async function () {
      const datastore = new DataStore()

      const doc = {
        fieldName: 'foo',
      }

      await datastore.connect()
      const result = await datastore.insert({
        data: doc,
        collection: 'test',
        schema: helper.getModelSchema(),
      })

      result.should.be.Array()
      result.length.should.eql(1)
      should.exist(result[0].fieldName)
      should.exist(result[0]._id)
      result[0]._id.should.be.String()
      result[0]._id.length.should.eql(24)
      should.equal(Object.keys(result[0]._id).length, 24)
    })

    it('should insert an array of documents and return inserted data', async function () {
      const datastore = new DataStore()

      const docs = [
        {
          fieldName: 'foo',
        },
        {
          fieldName: 'foo_1',
        },
      ]

      await datastore.connect()
      const result = await datastore.insert({
        data: docs,
        collection: 'test',
        schema: helper.getModelSchema(),
      })

      result.should.be.Array()
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
    })
  })

  describe('stats', function () {
    it('should return stats for the specified collection', async function () {
      const datastore = new DataStore()
      const doc = {fieldName: 'foo'}

      await datastore.connect()
      await datastore.insert({
        data: doc,
        collection: 'test',
        schema: helper.getModelSchema(),
      })

      const result = await datastore.stats('test', {})

      should.exist(result.count)
      result.count.should.eql(1)
    })
  })

  describe('find', function () {
    it('should find a single document by id', async function () {
      const datastore = new DataStore()

      const doc = {fieldName: 'foo'}

      await datastore.connect()

      const insertResult = await datastore.insert({
        data: doc,
        collection: 'test',
        schema: helper.getModelSchema(),
      })
      const inserted = insertResult[0]

      const result = await datastore.find({
        query: {_id: inserted._id},
        collection: 'test',
        schema: helper.getModelSchema(),
      })

      result.results.should.be.Array()
      result.results.length.should.eql(1)
      result.results[0]._id.should.eql(inserted._id)
      result.results[0]._id.length.should.eql(24)
      Object.keys(result.results[0]._id).length.should.eql(24)
    })

    it('should find a single document by query', async function () {
      const datastore = new DataStore()

      const doc = {fieldName: 'foo'}

      await datastore.connect()
      const insertResult = await datastore.insert({
        data: doc,
        collection: 'test',
        schema: helper.getModelSchema(),
      })
      const inserted = insertResult[0]

      const result = await datastore.find({
        query: {fieldName: inserted.fieldName},
        collection: 'test',
        schema: helper.getModelSchema(),
      })

      result.results.should.be.Array()
      result.results.length.should.eql(1)
      result.results[0]._id.should.eql(inserted._id)
      result.results[0]._id.length.should.eql(24)
      Object.keys(result.results[0]._id).length.should.eql(24)
    })

    it('should translate query using $containsAny', async function () {
      const datastore = new DataStore()

      const docs = [{fieldName: 'foo1'}, {fieldName: 'foo2'}]

      await datastore.connect()

      await datastore.insert({
        data: docs,
        collection: 'test',
        schema: helper.getModelSchema(),
      })

      const result = await datastore.find({
        query: {fieldName: {$containsAny: ['foo1']}},
        collection: 'test',
        schema: helper.getModelSchema(),
      })

      result.results.should.be.Array
      result.results.length.should.eql(1)
      result.results[0].fieldName.should.eql('foo1')
    })

    it('should translate query using regular expressions', async function () {
      const datastore = new DataStore()

      const docs = [{fieldName: 'foo1'}, {fieldName: 'foo2'}]

      await datastore.connect()
      await datastore.insert({
        data: docs,
        collection: 'test',
        schema: helper.getModelSchema(),
      })

      const result = await datastore.find({
        query: {fieldName: /foo1/},
        collection: 'test',
        schema: helper.getModelSchema(),
      })

      result.results.should.be.Array
      result.results.length.should.eql(1)
      result.results[0].fieldName.should.eql('foo1')
    })

    it('should return metadata when returning documents', async function () {
      const datastore = new DataStore()

      const doc = {fieldName: 'foo'}

      await datastore.connect()

      const insertResult = await datastore.insert({
        data: doc,
        collection: 'test',
        schema: helper.getModelSchema(),
      })
      const inserted = insertResult[0]

      const result = await datastore.find({
        query: {fieldName: inserted.fieldName},
        collection: 'test',
        schema: helper.getModelSchema(),
      })

      should.exist(result.metadata)
      result.metadata.totalCount.should.eql(1)
    })

    it('should perform aggregation query when given a JSON array', async function () {
      const datastore = new DataStore()

      const docs = [{fieldName: 'foo1'}, {fieldName: 'foo2'}]

      await datastore.connect()

      await datastore.insert({
        data: docs,
        collection: 'test',
        schema: helper.getModelSchema(),
      })

      const result = await datastore.find({
        query: [{$match: {fieldName: 'foo1'}}],
        collection: 'test',
        schema: helper.getModelSchema(),
      })

      result.should.be.Array
      result.length.should.eql(1)
      result[0].fieldName.should.eql('foo1')
      should.not.exist(result.metadata)
    })

    it('should return grouped result set when using $group in an aggregation query', async function () {
      const datastore = new DataStore()

      const docs = []

      for (let i = 0; i < 10; ++i) {
        docs.push({
          field1: ((Math.random() * 10) | 1).toString(),
          field2: (Math.random() * 10) | 1,
        })
      }

      await datastore.connect()
      await datastore.insert({
        data: docs,
        collection: 'test',
        schema: helper.getExtendedModelSchema(),
      })

      const result = await datastore.find({
        query: [
          {
            $group: {
              _id: null,
              averageNumber: {$avg: '$field2'},
              count: {$sum: 1},
            },
          },
        ],
        collection: 'test',
        schema: helper.getExtendedModelSchema(),
      })

      result.should.be.Array
      result.length.should.equal(1)
      result[0].averageNumber.should.be.above(0)
      should.not.exist(result.metadata)
    })

    it('should return normal result set when only using $match in an aggregation query', async function () {
      const datastore = new DataStore()

      const docs = []

      for (let i = 0; i < 10; ++i) {
        docs.push({
          field1: ((Math.random() * 10) | 1).toString(),
          field2: (Math.random() * 10) | 1,
        })
      }

      await datastore.connect()
      await datastore.insert({
        data: docs,
        collection: 'test',
        schema: helper.getExtendedModelSchema(),
      })

      const result = await datastore.find({
        query: [{$match: {field2: {$gte: 1}}}, {$limit: 2}],
        collection: 'test',
        schema: helper.getExtendedModelSchema(),
      })

      result.should.be.Array
      result.length.should.equal(2)
      result[0].field1.should.be.above(0)
      should.not.exist(result.metadata)
    })
  })

  describe('update', function () {
    it('should update a single document by id and return count', async function () {
      const datastore = new DataStore()

      const doc = {
        fieldName: 'foo',
      }

      await datastore.connect()
      const insertResult = await datastore.insert({
        data: doc,
        collection: 'test',
        schema: helper.getModelSchema(),
      })
      const id = insertResult[0]._id

      const update = {$set: {fieldName: 'fooXX'}}
      const result = await datastore.update({
        query: {_id: id},
        collection: 'test',
        update,
        options: {multi: false},
        schema: helper.getModelSchema(),
      })

      should.exist(result.matchedCount)
      result.matchedCount.should.eql(1)
    })

    it('should update many documents by query and return count', async function () {
      const datastore = new DataStore()

      const docs = [
        {
          fieldName: 'foo',
        },
        {
          fieldName: 'foo_1',
        },
      ]

      await datastore.connect()
      await datastore.insert({
        data: docs,
        collection: 'test',
        schema: helper.getModelSchema(),
      })

      const query = {fieldName: {$regex: '^foo'}}
      const result = await datastore.update({
        query,
        collection: 'test',
        update: {$set: {fieldName: 'xxx'}},
        schema: helper.getModelSchema(),
      })

      should.exist(result.matchedCount)
      result.matchedCount.should.eql(2)
    })
  })

  describe('delete', function () {
    it('should delete a single document by id and return count', async function () {
      const datastore = new DataStore()

      const doc = {
        fieldName: 'foo',
      }

      await datastore.connect()
      const insertResult = await datastore.insert({
        data: doc,
        collection: 'test',
        schema: helper.getModelSchema(),
      })
      const id = insertResult[0]._id

      const result = await datastore.delete({
        query: {_id: id},
        collection: 'test',
        schema: helper.getModelSchema(),
      })

      should.exist(result.deletedCount)
      result.deletedCount.should.eql(1)
    })

    it('should delete many documents by query and return count', async function () {
      const datastore = new DataStore()

      const docs = [
        {
          fieldName: 'foo',
        },
        {
          fieldName: 'foo_1',
        },
      ]

      await datastore.connect()
      await datastore.insert({
        data: docs,
        collection: 'test',
        schema: helper.getModelSchema(),
      })

      const query = {fieldName: {$regex: '^foo'}}
      const result = await datastore.delete({
        query,
        collection: 'test',
        schema: helper.getModelSchema(),
      })

      should.exist(result.deletedCount)
      result.deletedCount.should.eql(2)
    })
  })

  describe('search', function () {
    it('should find records in the search index collection that match a single term being searched for', async function () {
      this.skip()

      const datastore = new DataStore()

      const modelSchema = helper.getModelSchema()

      modelSchema.fieldName.search = {
        weight: 2,
      }

      const document = {
        fieldName: 'Beyond the Valley of the Dolls',
      }

      await datastore.connect()

      // insert document
      const insertResult = await datastore.insert({
        data: document,
        collection: 'test',
        schema: modelSchema,
      })
      const documentId = insertResult[0]._id

      // insert tokenised words
      const words = [
        {word: 'beyond'},
        {word: 'valley'},
        {word: 'dolls'},
        {word: 'second'},
        {word: 'third'},
        {word: 'escape'},
      ]

      const wordInsertResult = await datastore.insert({
        data: words,
        collection: 'words',
        schema: helper.getWordSchema(),
      })
      const wordId = wordInsertResult.find((word) => word.word === 'valley')._id

      // insert search reference document
      const searchDocument = {
        weight: 0.6137056388801094,
        word: wordId.toString(),
        document: documentId.toString(),
      }

      await datastore.insert({
        data: searchDocument,
        collection: 'testSearch',
        schema: helper.getSearchSchema(),
      })

      // call search method to get document IDs for retrieval
      const result = await datastore.search({
        words: [wordId.toString()],
        collection: 'testSearch',
        schema: helper.getSearchSchema(),
      })

      result.should.be.instanceOf(Array)
      result.length.should.eql(1)
      result[0]._id.document.should.eql(documentId)
    })

    it('should find records in the search index collection that match multiple terms being searched for', async function () {
      this.skip()

      const datastore = new DataStore()

      const modelSchema = helper.getModelSchema()

      modelSchema.fieldName.search = {
        weight: 2,
      }

      const documents = [
        {
          fieldName: 'Beyond the Valley of the Dolls',
        },
        {
          fieldName: 'Escape from the Valley',
        },
        {
          fieldName: 'The Dolls House',
        },
      ]

      await datastore.connect()

      // insert document
      const insertedDocuments = await datastore.insert({
        data: documents,
        collection: 'test',
        schema: modelSchema,
      })

      // insert tokenised words
      const words = [
        {word: 'beyond'},
        {word: 'valley'},
        {word: 'dolls'},
        {word: 'second'},
        {word: 'third'},
        {word: 'escape'},
        {word: 'house'},
        {word: 'from'},
      ]

      const insertedWords = await datastore.insert({
        data: words,
        collection: 'words',
        schema: helper.getWordSchema(),
      })

      // insert search reference document
      const searchDocuments = [
        {
          weight: 0.6137056388801094,
          word: insertedWords.find((word) => word.word === 'valley')._id,
          document: documents.find(
            (document) =>
              document.fieldName === 'Beyond the Valley of the Dolls',
          )._id,
        },
        {
          weight: 0.6137056388801094,
          word: insertedWords.find((word) => word.word === 'dolls')._id,
          document: documents.find(
            (document) =>
              document.fieldName === 'Beyond the Valley of the Dolls',
          )._id,
        },
        {
          weight: 0.6137056388801094,
          word: insertedWords.find((word) => word.word === 'beyond')._id,
          document: documents.find(
            (document) =>
              document.fieldName === 'Beyond the Valley of the Dolls',
          )._id,
        },
        {
          weight: 0.6137056388801094,
          word: insertedWords.find((word) => word.word === 'valley')._id,
          document: documents.find(
            (document) => document.fieldName === 'Escape from the Valley',
          )._id,
        },
        {
          weight: 0.6137056388801094,
          word: insertedWords.find((word) => word.word === 'escape')._id,
          document: documents.find(
            (document) => document.fieldName === 'Escape from the Valley',
          )._id,
        },
        {
          weight: 0.6137056388801094,
          word: insertedWords.find((word) => word.word === 'dolls')._id,
          document: documents.find(
            (document) => document.fieldName === 'The Dolls House',
          )._id,
        },
        {
          weight: 0.6137056388801094,
          word: insertedWords.find((word) => word.word === 'house')._id,
          document: documents.find(
            (document) => document.fieldName === 'The Dolls House',
          )._id,
        },
      ]

      await datastore.insert({
        data: searchDocuments,
        collection: 'testSearch',
        schema: helper.getSearchSchema(),
      })

      // call search method to get document IDs for retrieval
      const query = [
        insertedWords.find((word) => word.word === 'dolls')._id,
        insertedWords.find((word) => word.word === 'house')._id,
      ]

      const result = await datastore.search({
        words: query,
        collection: 'testSearch',
        schema: helper.getSearchSchema(),
      })

      result.should.be.instanceOf(Array)
      result.length.should.eql(2)

      function getDocumentId(title) {
        return insertedDocuments.find(
          (document) => document.fieldName === title,
        )._id
      }

      const documentId1 = getDocumentId('The Dolls House')
      const documentId2 = getDocumentId('Beyond the Valley of the Dolls')

      should.exist(
        result.find((document) => document._id.document === documentId1),
      )
      should.exist(
        result.find((document) => document._id.document === documentId2),
      )
    })
  })
})
