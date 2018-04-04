const ApiConnector = require('../lib')
const EventEmitter = require('events').EventEmitter
const fs = require('fs')
const help = require('./help')
const path = require('path')
const querystring = require('querystring')
const should = require('should')
const url = require('url')
const uuid = require('uuid')

const config = require(__dirname + '/../config')

describe.only('ApiConnector', function () {
  this.timeout(15000)

  afterEach(() => {
    const connector = new ApiConnector()

    return connector.connect().then(() => {
      return connector.dropDatabase('testdb')
    })
  })

  describe('constructor', function () {
    it('should be exposed', function (done) {
      ApiConnector.should.be.Function
      done()
    })

    it('should inherit from EventEmitter', function (done) {
      const apiConnector = new ApiConnector()
      apiConnector.should.be.an.instanceOf(EventEmitter)
      apiConnector.emit.should.be.Function
      done()
    })

    // it('should load config if no options supplied', function (done) {
    //   const apiConnector = new ApiConnector()
    //   should.exist(apiConnector.config)
    //   apiConnector.config.database.path.should.eql('test/workspace')
    //   done()
    // })

    // it('should load config from options supplied', function (done) {
    //   const apiConnector = new ApiConnector({ database: { path: 'test/workspace2' } })
    //   should.exist(apiConnector.config)
    //   apiConnector.config.database.path.should.eql('test/workspace2')
    //   done()
    // })

    it('should have readyState == 0 when initialised', function (done) {
      const apiConnector = new ApiConnector()
      apiConnector.readyState.should.eql(0)
      done()
    })
  })

  describe('connect', function () {
    it('should create and return database when connecting', function () {
      const apiConnector = new ApiConnector()

      return apiConnector.connect({
        database: 'testdb'
      }).then(() => {
        should.exist(apiConnector.database)  
      })
    })

    it('should have readyState == 1 when connected', function (done) {
      const apiConnector = new ApiConnector()
      apiConnector.connect({ database: 'testdb', collection: 'posts' }).then(() => {
        apiConnector.readyState.should.eql(1)
        done()
      })
    })
  })

  describe('insert', function () {
    it('should insert a single document into the database', function () {
      const apiConnector = new ApiConnector()
      const schema = help.getSchema('users')

      return apiConnector.connect({
        database: 'testdb',
        collection: 'users'
      }).then(connection => {
        const user = { name: 'David' }

        return apiConnector.insert({
          data: user,
          collection: 'users',
          schema: schema.fields,
          settings: schema.settings
        })
      }).then(results => {
        results.constructor.name.should.eql('Array')
        results[0].name.should.eql('David')
      })
    })

    it('should insert an array of documents into the database', function () {
      const apiConnector = new ApiConnector()

      return apiConnector.connect({
        database: 'testdb',
        collection: 'users'
      }).then(connection => {
        const users = [{ name: 'Ernest' }, { name: 'Wallace' }]
        const schema = help.getSchema('users')

        return apiConnector.insert({
          data: users,
          collection: 'users',
          schema: schema.fields,
          settings: schema.settings
        }).then(results => {
          results.constructor.name.should.eql('Array')
          results.length.should.eql(2)
          results[0].name.should.eql('Ernest')
          results[1].name.should.eql('Wallace')
        })
      })
    })

    it('should add an _id property to a single inserted document as a plain String', function () {
      const apiConnector = new ApiConnector()

      return apiConnector.connect({
        database: 'testdb',
        collection: 'users'
      }).then(connection => {
        const schema = help.getSchema('users')

        return apiConnector.insert({
          data: { name: 'Ernest' },
          collection: 'users',
          schema: schema.fields,
          settings: schema.settings
        }).then((results) => {
          results.constructor.name.should.eql('Array')
          results.length.should.eql(1)

          results[0].name.should.eql('Ernest')
          results[0]._id.constructor.name.should.eql('String')
          results[0]._id.length.should.eql(24)
          
          // Check that it's a plain string.
          Object.keys(results[0]._id).length.should.eql(24)
        })
      })
    })

    it('should add a different _id property to each inserted document as plain Strings', function () {
      const apiConnector = new ApiConnector()

      return apiConnector.connect({
        database: 'testdb',
        collection: 'users'
      }).then(connection => {
        const users = [{ name: 'Ernest' }, { name: 'Wallace' }]
        const schema = help.getSchema('users')

        return apiConnector.insert({
          data: users,
          collection: 'users',
          schema: schema.fields,
          settings: schema.settings
        }).then((results) => {
          results.constructor.name.should.eql('Array')
          results.length.should.eql(2)

          results[0].name.should.eql('Ernest')
          results[0]._id.constructor.name.should.eql('String')
          results[0]._id.length.should.eql(24)
          Object.keys(results[0]._id).length.should.eql(24)

          results[1].name.should.eql('Wallace')
          results[1]._id.constructor.name.should.eql('String')
          results[1]._id.length.should.eql(24)
          Object.keys(results[1]._id).length.should.eql(24)

          results[0]._id.should.not.eql(results[1]._id)
        })
      })
    })
  })

  describe('find', function () {
    it('should find a single document in the database', function () {
      const apiConnector = new ApiConnector()

      return apiConnector.connect({
        database: 'testdb',
        collection: 'users'
      }).then(connection => {
        const users = [{ name: 'Ernest' }, { name: 'Wallace' }]
        const schema = help.getSchema('users')

        return apiConnector.insert({
          data: users,
          collection: 'users',
          schema: schema.fields,
          settings: schema.settings
        }).then((results) => {
          return apiConnector.find({
            collection: 'users',
            query: { name: 'Wallace' },
            schema: schema.fields,
            settings: schema.settings
          })
        }).then((response) => {
          response.results.constructor.name.should.eql('Array')
          response.results.length.should.eql(1)
          response.results[0].name.should.eql('Wallace')
        })
      })
    })

    it('should convert the ID of a single document to a plain String', function () {
      const apiConnector = new ApiConnector()

      return apiConnector.connect({
        database: 'testdb',
        collection: 'users'
      }).then(connection => {
        const users = [{ name: 'Ernest' }, { name: 'Wallace' }]
        const schema = help.getSchema('users')

        return apiConnector.insert({
          data: users,
          collection: 'users',
          schema: schema.fields,
          settings: schema.settings
        }).then((results) => {
          return apiConnector.find({
            collection: 'users',
            query: { name: 'Wallace' },
            schema: schema.fields,
            settings: schema.settings
          })
        }).then((response) => {
          results[0]._id.length.should.eql(24)
          Object.keys(results[0]._id).length.should.eql(24)
        })
      })
    })

    it('should convert the ID of each returned document to a plain String', function () {
      const apiConnector = new ApiConnector()

      return apiConnector.connect({
        database: 'testdb',
        collection: 'users'
      }).then(connection => {
        const users = [{ name: 'Ernest' }, { name: 'Wallace' }]
        const schema = help.getSchema('users')

        return apiConnector.insert({
          data: users,
          collection: 'users',
          schema: schema.fields,
          settings: schema.settings
        }).then((results) => {
          return apiConnector.find({
            collection: 'users',
            query: { },
            schema: schema.fields,
            settings: schema.settings
          })
        }).then((response) => {
          results[0]._id.length.should.eql(24)
          Object.keys(results[0]._id).length.should.eql(24)
          results[1]._id.length.should.eql(24)
          Object.keys(results[1]._id).length.should.eql(24)
        })
      })
    })

    it('should return the number of records requested when using `limit`', function () {
      const apiConnector = new ApiConnector()

      return apiConnector.connect({
        database: 'testdb',
        collection: 'users'
      }).then(connection => {
        const users = [
          { _createdAt: 123, name: 'BigBird' },
          { _createdAt: 123, name: 'Ernie' },
          { _createdAt: 123, name: 'Oscar' }
        ]
        const schema = help.getSchema('users')

        return apiConnector.insert({
          data: users,
          collection: 'users',
          schema: schema.fields,
          settings: schema.settings
        }).then((results) => {
          return apiConnector.find({
            collection: 'users',
            options: { limit: 2 },
            query: {},
            schema: schema.fields,
            settings: schema.settings
          })
        }).then((response) => {
          response.results.constructor.name.should.eql('Array')
          response.results.length.should.eql(2)
        })
      })
    })

    it('should sort records in ascending order by the `createdAt` property when no query or sort are provided', function () {
      const apiConnector = new ApiConnector()
      const users = [
        { _createdAt: 987, name: 'Ernie' },
        { _createdAt: 876, name: 'Oscar' },
        { _createdAt: 765, name: 'BigBird' }
      ]
      const schema = help.getSchema('users')

      return apiConnector.connect({
        database: 'testdb',
        collection: 'users'
      }).then(connection => {
        return apiConnector.insert({
          data: users,
          collection: 'users',
          schema: schema.fields,
          settings: schema.settings
        })
      }).then((results) => {
        return apiConnector.find({
          collection: 'users',
          options: {},
          query: {},
          schema: schema.fields,
          settings: schema.settings
        })
      }).then((response) => {
        response.results.constructor.name.should.eql('Array')
        response.results.length.should.eql(3)

        response.results[0].name.should.eql(users[2].name)
        response.results[1].name.should.eql(users[1].name)
        response.results[2].name.should.eql(users[0].name)
      })
    })

    it('should sort records in ascending order by the query property when no sort is provided', function () {
      const apiConnector = new ApiConnector()
      const users = [{ name: 'BigBird 3' }, { name: 'BigBird 1' }, { name: 'BigBird 2' }]
      const schema = help.getSchema('users')

      return apiConnector.connect({
        database: 'testdb',
        collection: 'users'
      }).then(connection => {
        return apiConnector.insert({
          data: users,
          collection: 'users',
          schema: schema.fields,
          settings: schema.settings
        })
      }).then(result => {
        return apiConnector.find({
          collection: 'users',
          options: {},
          query: { name: { '$regex': 'Big' } },
          schema: schema.fields,
          settings: schema.settings
        })
      }).then(({results, metadata}) => {
        results.constructor.name.should.eql('Array')
        results.length.should.eql(3)
        results[0].name.should.eql('BigBird 1')
        results[1].name.should.eql('BigBird 2')
        results[2].name.should.eql('BigBird 3')
      })
    })

    it('should sort records in ascending order by the specified property', function () {
      const apiConnector = new ApiConnector()
      const users = [{ name: 'Ernie' }, { name: 'Oscar' }, { name: 'BigBird' }]
      const schema = help.getSchema('users')

      return apiConnector.connect({
        database: 'testdb',
        collection: 'users'
      }).then(connection => {
        return apiConnector.insert({
          data: users,
          collection: 'users',
          schema: schema.fields,
          settings: schema.settings
        })
      }).then(result => {
        return apiConnector.find({
          collection: 'users',
          options: { sort: { name: 1 } },
          query: {},
          schema: schema.fields,
          settings: schema.settings
        })
      }).then(({results, metadata}) => {
        results.constructor.name.should.eql('Array')
        results.length.should.eql(3)
        results[0].name.should.eql('BigBird')
        results[1].name.should.eql('Ernie')
        results[2].name.should.eql('Oscar')
      })
    })

    it('should sort records in descending order by the specified property', function () {
      const apiConnector = new ApiConnector()
      const users = [{ name: 'Ernie' }, { name: 'Oscar' }, { name: 'BigBird' }]
      const schema = help.getSchema('users')

      return apiConnector.connect({
        database: 'testdb',
        collection: 'users'
      }).then(connection => {
        return apiConnector.insert({
          data: users,
          collection: 'users',
          schema: schema.fields,
          settings: schema.settings
        })
      }).then(result => {
        return apiConnector.find({
          collection: 'users',
          options: { sort: { name: -1 } },
          query: {},
          schema: schema.fields,
          settings: schema.settings
        })
      }).then(({results, metadata}) => {
        results.constructor.name.should.eql('Array')
        results.length.should.eql(3)
        results[0].name.should.eql('Oscar')
        results[1].name.should.eql('Ernie')
        results[2].name.should.eql('BigBird')
      })
    })

    it('should return only the fields specified by the `fields` property', function () {
      const apiConnector = new ApiConnector()
      const users = [
        { name: 'Ernie', age: 7, colour: 'yellow' },
        { name: 'Oscar', age: 9, colour: 'green' },
        { name: 'BigBird', age: 13, colour: 'yellow' }
      ]
      const schema = help.getSchema('users')

      return apiConnector.connect({
        database: 'testdb',
        collection: 'users'
      }).then(connection => {
        return apiConnector.insert({
          data: users,
          collection: 'users',
          schema: schema.fields,
          settings: schema.settings
        })
      }).then(result => {
        return apiConnector.find({
          collection: 'users',
          options: {
            sort: { name: 1 },
            fields: { name: 1, age: 1 }
          },
          query: { colour: 'yellow' },
          schema: schema.fields,
          settings: schema.settings
        })
      }).then(({results, metadata}) => {
        results.constructor.name.should.eql('Array')
        results.length.should.eql(2)

        const bigBird = results[0]

        should.exist(bigBird.name)
        should.exist(bigBird.age)
        should.exist(bigBird._id)
        should.not.exist(bigBird.colour)
      })
    })

    it('should handle all query operators', function () {
      const apiConnector = new ApiConnector()
      const users = [
        {
          _createdAt: 100,
          name: 'Ernie',
          age: 7,
          colour: 'yellow',
          interests: [
            'pigeons',
            'bottle caps',
            'paper clips',
            'oatmeal',
            'sunny days'
          ],
          favouriteNumber: 8243721
        },
        {
          _createdAt: 101,
          name: 'Oscar',
          age: 9,
          colour: 'green',
          interests: [
            'rainy days',
            'trash cans'
          ]
        },
        {
          _createdAt: 102,
          name: 'BigBird',
          age: 13,
          colour: 'yellow',
          interests: [
            'knowledge',
            'jokes',
            'sunny days'
          ]
        }
      ]
      const schema = help.getSchema('users')

      return apiConnector.connect({
        database: 'testdb',
        collection: 'users'
      }).then(connection => {
        return apiConnector.insert({
          data: users,
          collection: 'users',
          schema: schema.fields,
          settings: schema.settings
        })
      }).then(result => {
        // Simple query by field
        return apiConnector.find({
          collection: 'users',
          options: {},
          query: { name: 'BigBird' },
          schema: schema.fields,
          settings: schema.settings
        }).then(({results, metadata}) => {
          results.constructor.name.should.eql('Array')
          results.length.should.eql(1)
          results[0].name.should.eql('BigBird')
        })
      }).then(result => {
        // $eq
        return apiConnector.find({
          collection: 'users',
          options: {},
          query: { name: { '$eq': 'BigBird' } },
          schema: schema.fields,
          settings: schema.settings
        }).then(({results, metadata}) => {
          results.constructor.name.should.eql('Array')
          results.length.should.eql(1)
          results[0].name.should.eql('BigBird')
        })
      }).then(result => {
        // $contains
        return apiConnector.find({
          collection: 'users',
          options: {},
          query: { name: { '$contains': 'Bird' } },
          schema: schema.fields,
          settings: schema.settings
        }).then(({results, metadata}) => {
          results.constructor.name.should.eql('Array')
          results.length.should.eql(1)
          results[0].name.should.eql('BigBird')
        })
      }).then(result => {
        // $in
        return apiConnector.find({
          collection: 'users',
          options: {},
          query: { age: { '$in': [7, 13] } },
          schema: schema.fields,
          settings: schema.settings
        }).then(({results, metadata}) => {
          results.constructor.name.should.eql('Array')
          results.length.should.eql(2)
          results[0].name.should.eql('Ernie')
          results[1].name.should.eql('BigBird')
        })
      }).then(result => {
        // $not_contains
        return apiConnector.find({
          collection: 'users',
          options: {},
          query: { name: { '$not_contains': 'Big' } },
          schema: schema.fields,
          settings: schema.settings
        }).then(({results, metadata}) => {
          results.constructor.name.should.eql('Array')
          results.length.should.eql(2)
          results[0].name.should.eql('Ernie')
          results[1].name.should.eql('Oscar')
        })
      }).then(result => {
        // $between
        return apiConnector.find({
          collection: 'users',
          options: {},
          query: { age: { '$between': [8, 12] } },
          schema: schema.fields,
          settings: schema.settings
        }).then(({results, metadata}) => {
          results.constructor.name.should.eql('Array')
          results.length.should.eql(1)
          results[0].name.should.eql('Oscar')
        })
      }).then(result => {
        // $exists (true)
        return apiConnector.find({
          collection: 'users',
          options: {},
          query: { favouriteNumber: { '$exists': true } },
          schema: schema.fields,
          settings: schema.settings
        }).then(({results, metadata}) => {
          results.constructor.name.should.eql('Array')
          results.length.should.eql(1)
          results[0].name.should.eql('Ernie')
        })
      }).then(result => {
        // $exists (false)
        return apiConnector.find({
          collection: 'users',
          options: {},
          query: { favouriteNumber: { '$exists': false } },
          schema: schema.fields,
          settings: schema.settings
        }).then(({results, metadata}) => {
          results.constructor.name.should.eql('Array')
          results.length.should.eql(2)
          results[0].name.should.eql('BigBird')
          results[1].name.should.eql('Oscar')
        })
      })
    })
  })

  describe('update', function () {
    describe('$set', function () {
      it('should update documents matching the query', function () {
        const apiConnector = new ApiConnector()
        const users = [
          { name: 'Ernie', age: 7, colour: 'yellow' },
          { name: 'Oscar', age: 9, colour: 'green' },
          { name: 'BigBird', age: 13, colour: 'yellow' }
        ]
        const schema = help.getSchema('users')

        return apiConnector.connect({
          database: 'testdb',
          collection: 'users'
        }).then(connection => {
          return apiConnector.insert({
            data: users,
            collection: 'users',
            schema: schema.fields,
            settings: schema.settings
          })
        }).then(result => {
          return apiConnector.update({
            collection: 'users',
            query: { colour: 'green' },
            update: { '$set': { colour: 'yellow' } },
            schema: schema.fields
          })
        }).then(response => {
          response.matchedCount.should.eql(1)

          return apiConnector.find({
            collection: 'users',
            options: {},
            query: { colour: 'yellow' },
            schema: schema.fields,
            settings: schema.settings
          })
        }).then(({results, metadata}) => {
          results.constructor.name.should.eql('Array')
          results.length.should.eql(3)
        })
      })
    })

    describe('$inc', function () {
      it('should update documents matching the query', function () {
        const apiConnector = new ApiConnector()
        const users = [
          { name: 'Ernie', age: 7, colour: 'yellow' },
          { name: 'Oscar', age: 9, colour: 'green' },
          { name: 'BigBird', age: 13, colour: 'yellow' }
        ]
        const schema = help.getSchema('users')

        return apiConnector.connect({
          database: 'testdb',
          collection: 'users'
        }).then(connection => {
          return apiConnector.insert({
            data: users,
            collection: 'users',
            schema: schema.fields,
            settings: schema.settings
          })
        }).then(result => {
          return apiConnector.update({
            collection: 'users',
            query: { colour: 'green' },
            update: { '$inc': { age: 10 } },
            schema: schema.fields
          })
        }).then(response => {
          response.matchedCount.should.eql(1)

          return apiConnector.find({
            collection: 'users',
            options: {},
            query: { colour: 'green' },
            schema: schema.fields,
            settings: schema.settings
          })
        }).then(({results, metadata}) => {
          results.constructor.name.should.eql('Array')
          results.length.should.eql(1)
          results[0].age.should.eql(19)
        })
      })
    })

    describe('$push', function () {
      it('should update documents matching the query', function () {
        const apiConnector = new ApiConnector()
        const users = [
          {
            _createdAt: 100,
            name: 'Ernie',
            interests: [
              'pigeons',
              'bottle caps',
              'paper clips',
              'oatmeal'
            ],
            favouriteNumber: 8243721
          },
          {
            _createdAt: 101,
            name: 'Oscar',
            interests: [
              'rainy days',
              'trash cans'
            ]
          },
          {
            _createdAt: 102,
            name: 'BigBird',
            interests: [
              'knowledge',
              'jokes'
            ]
          }
        ]
        const schema = help.getSchema('users')

        return apiConnector.connect({
          database: 'testdb',
          collection: 'users'
        }).then(connection => {
          return apiConnector.insert({
            data: users,
            collection: 'users',
            schema: schema.fields,
            settings: schema.settings
          })
        }).then(result => {
          return apiConnector.update({
            collection: 'users',
            query: { name: { '$in': ['Ernie', 'BigBird'] } },
            update: { '$push': { interests: 'sunny days' } },
            schema: schema.fields
          })
        }).then(response => {
          response.matchedCount.should.eql(2)

          return apiConnector.find({
            collection: 'users',
            options: {},
            query: { },
            schema: schema.fields,
            settings: schema.settings
          })
        }).then(({results, metadata}) => {
          results.constructor.name.should.eql('Array')
          results.length.should.eql(3)
          results[0].interests.length.should.eql(5)
          results[1].interests.length.should.eql(2)
          results[2].interests.length.should.eql(3)
        })
      })
    })
  })

  describe('delete', function () {
    it('should delete documents matching the query', function () {
      const apiConnector = new ApiConnector()
      const users = [
        { _createdAt: 123, name: 'Ernie', age: 7, colour: 'yellow' },
        { _createdAt: 123, name: 'Oscar', age: 9, colour: 'green' },
        { _createdAt: 123, name: 'BigBird', age: 13, colour: 'yellow' }
      ]
      const schema = help.getSchema('users')

      return apiConnector.connect({
        database: 'testdb',
        collection: 'users'
      }).then(connection => {
        return apiConnector.insert({
          data: users,
          collection: 'users',
          schema: schema.fields,
          settings: schema.settings
        })
      }).then(result => {
        return apiConnector.delete({
          collection: 'users',
          query: { colour: 'green' },
          schema: schema.fields
        })
      }).then(result => {
        result.deletedCount.should.eql(1)

        return apiConnector.find({
          collection: 'users',
          options: {},
          query: {},
          schema: schema.fields,
          settings: schema.settings
        })
      }).then(({results, metadata}) => {
        results.constructor.name.should.eql('Array')
        results.length.should.eql(2)
      })
    })
  })

  describe('database', function () {
    it('should contain all collections that have been inserted into', function () {
      const apiConnector = new ApiConnector()
      const postsSchema = help.getSchema('posts')
      const usersSchema = help.getSchema('users')

      return apiConnector.connect({
        database: 'testdb',
        collection: 'users'
      }).then(connection => {
        return apiConnector.insert({
          data: { _createdAt: 123, name: 'David' },
          collection: 'users',
          schema: usersSchema.fields,
          settings: usersSchema.settings
        })
      }).then(response => {
        return apiConnector.connect({
          database: 'testdb',
          collection: 'posts'
        })
      }).then(connection => {
        return apiConnector.insert({
          data: { _createdAt: 123, title: 'David on Holiday' },
          collection: 'posts',
          schema: postsSchema.fields,
          settings: postsSchema.settings
        })
      }).then(response => {
        return apiConnector.find({
          collection: 'users',
          options: {},
          query: {},
          schema: usersSchema.fields,
          settings: usersSchema.settings
        })
      }).then(({results, metadata}) => {
        results.constructor.name.should.eql('Array')
        results[0].name.should.eql('David')

        return apiConnector.find({
          collection: 'posts',
          options: {},
          query: {},
          schema: postsSchema.fields,
          settings: postsSchema.settings
        })
      }).then(({results, metadata}) => {
        results.constructor.name.should.eql('Array')
        results[0].title.should.eql('David on Holiday')
      })
    })

    it('should handle connection to multiple databases', function () {
      const postsStore = new ApiConnector()
      const usersStore = new ApiConnector()
      
      const postsSchema = help.getSchema('posts')
      const usersSchema = help.getSchema('users')

      return usersStore.connect({
        database: 'testdb',
        collection: 'users'
      }).then(connection => {
        return postsStore.connect({
          database: 'test2',
          collection: 'posts'
        })
      }).then(connection => {
        return usersStore.insert({
          data: { _createdAt: 123, name: 'Jim' },
          collection: 'users',
          schema: usersSchema.fields,
          settings: usersSchema.settings
        })
      }).then(response => {
        return postsStore.insert({
          data: { _createdAt: 123, title: 'Jim in Portugal' },
          collection: 'posts',
          schema: postsSchema.fields,
          settings: postsSchema.settings
        })
      }).then(response => {
        return usersStore.find({
          collection: 'users',
          options: {},
          query: { name: 'Jim' },
          schema: usersSchema.fields,
          settings: usersSchema.settings
        })
      }).then(({results, metadata}) => {
        results.constructor.name.should.eql('Array')
        results.length.should.eql(1)
        results[0].name.should.eql('Jim')

        return postsStore.find({
          collection: 'posts',
          options: {},
          query: { title: 'Jim in Portugal' },
          schema: postsSchema.fields,
          settings: postsSchema.settings
        })
      }).then(({results, metadata}) => {
        results.constructor.name.should.eql('Array')
        results.length.should.eql(1)
        results[0].title.should.eql('Jim in Portugal')

        return help.resetDatabase('test2')
      })
    })
  })
})