import * as helper from './helper.js'
import DataStore from '../../lib/index.js'
import {EventEmitter} from 'events'
import packageJson from '../../package.json' assert {type: 'json'}

describe('MongoDB', function () {
  this.timeout(2000)

  describe('constructor', function () {
    it('should be exposed', function (done) {
      DataStore.should.be.Function
      done()
    })

    it('should inherit from EventEmitter', function (done) {
      const mongodb = new DataStore()

      mongodb.should.be.an.instanceOf(EventEmitter)
      mongodb.emit.should.be.Function
      done()
    })

    it('should have readyState == 0 when initialised', function (done) {
      const mongodb = new DataStore()

      mongodb.readyState.should.eql(0)
      done()
    })

    it('should expose a handshake function', function (done) {
      const mongodb = new DataStore()

      mongodb.handshake().version.should.eql(packageJson.version)
      done()
    })
  })

  describe('query utils', function () {
    describe('convertObjectIdsForSave', function () {
      it('should be a method', function (done) {
        new DataStore().convertObjectIdsForSave.should.be.Function
        done()
      })

      it('should accept schema and object and replace ObjectIDs in array', function (done) {
        const fields = helper.getModelSchema()
        const schema = {}

        schema.fields = fields

        schema.fields.field2 = Object.assign({}, schema.fields.fieldName, {
          type: 'ObjectID',
          required: false,
        })

        const mongodb = new DataStore()
        let obj = {fieldName: 'Hello', field2: ['55cb1658341a0a804d4dadcc']}

        obj = mongodb.convertObjectIdsForSave(obj, schema.fields)

        const t = typeof obj.field2[0]

        t.should.eql('object')

        done()
      })

      it('should accept schema and object and replace ObjectIDs as single value', function (done) {
        const fields = helper.getModelSchema()
        const schema = {}

        schema.fields = fields

        schema.fields.field2 = Object.assign({}, schema.fields.fieldName, {
          type: 'ObjectID',
          required: false,
        })

        const mongodb = new DataStore()
        let obj = {fieldName: 'Hello', field2: '55cb1658341a0a804d4dadcc'}

        obj = mongodb.convertObjectIdsForSave(obj, schema.fields)

        const t = typeof obj.field2

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
      it('should convert Strings to ObjectIDs when the field is _id', () => {
        const mongodb = new DataStore()
        const query1 = {field1: 'hello'}
        const query2 = {field1: '55cb1658341a0a804d4dadcc'}
        const query3 = {_id: '55cb1658341a0a804d4dadcc'}
        const query4 = {_id: {$ne: '55cb1658341a0a804d4dadcc'}}
        const query5 = {
          _id: {$in: ['55cb1658341a0a804d4dadca', '55cb1658341a0a804d4dadcb']},
        }

        const newQuery1 = mongodb.createObjectIdFromString(query1)
        const newQuery2 = mongodb.createObjectIdFromString(query2)
        const newQuery3 = mongodb.createObjectIdFromString(query3)
        const newQuery4 = mongodb.createObjectIdFromString(query4)
        const newQuery5 = mongodb.createObjectIdFromString(query5)

        newQuery1.field1.should.be.type('string')
        newQuery2.field1.should.be.type('string')
        newQuery3._id.should.be.type('object')
        newQuery4._id.$ne.should.be.type('object')
        newQuery5._id.$in[0].should.be.type('object')
        newQuery5._id.$in[1].should.be.type('object')
      })

      it('should not convert (sub query) Strings to ObjectIDs when a field type is Object', function (done) {
        let query = {field3: {_id: '55cb1658341a0a804d4dadcc'}}

        const mongodb = new DataStore()

        query = mongodb.createObjectIdFromString(query)

        const type = typeof query.field3._id

        type.should.eql('string')

        done()
      })

      it('should not convert (dot notation) Strings to ObjectIDs when a field type is Object', function (done) {
        let query = {'field3._id': '55cb1658341a0a804d4dadcc'}

        const mongodb = new DataStore()

        query = mongodb.createObjectIdFromString(query)

        const type = typeof query[Object.keys(query)[0]]

        type.should.eql('string')

        done()
      })
    })
  })
})
