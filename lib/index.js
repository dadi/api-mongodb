'use strict'

const config = require('../config')
const debug = require('debug')('api:mongodb')
const EventEmitter = require('events').EventEmitter
const metadata = require('@dadi/metadata')
const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient
const ObjectID = require('mongodb').ObjectID
const qs = require('querystring')
const util = require('util')

/**
 * @typedef ConnectionOptions
 * @type {Object}
 * @property {string} database - the name of the database file to use
 * @property {Object} collection - the name of the collection to use
 */

/**
 * @typedef QueryOptions
 * @type {Object}
 * @property {number} limit - the number of records to return
 * @property {number} skip - an offset, the number of records to skip
 * @property {Object} sort - an object specifying properties to sort by. `{"title": 1}` will sort the results by the `title` property in ascending order. To reverse the sort, use `-1`: `{"title": -1}`
 * @property {Object} fields - an object specifying which properties to return. `{"title": 1}` will return results with all properties removed except for `_id` and `title`
 */

/**
 * Handles the interaction with MongoDB
 * @constructor DataStore
 * @classdesc DataStore adapter for using MongoDB with DADI API
 * @implements EventEmitter
 */
const DataStore = function DataStore (options) {
  this.config = options || config.get()
  this._connections = []
  this._mongoClient = new MongoClient()

  this.nonValidatedProperties = ['$loki', 'meta']

  // connection readyState
  // 0 = disconnected
  // 1 = connected
  // 2 = connecting
  // 3 = disconnecting
  this.readyState = 0
}

util.inherits(DataStore, EventEmitter)

/**
 * Connect to the database
 *
 * @param {ConnectionOptions} options
 */
DataStore.prototype.connect = function (options) {
  debug('connect %o', options)

  this.connectionOptions = this.getConnectionOptions(options)
  this.connectionString = this.constructConnectionString(this.connectionOptions)

  debug('connect %s', this.connectionString)

  // if a connection exists for the specified database, return it
  if (this._connections[this.connectionString]) {
    return this._connections[this.connectionString]
  }

    // if (conn.readyState === 2) {
    //   setTimeout(function () {
    //     conn.connect()
    //   }, 5000)
    // }

  return new Promise((resolve, reject) => {
    this._mongoClient.connect(this.connectionString, (err, db) => {
      if (err) {
        this.readyState = 0
        return reject(err)
      }

      this.readyState = 1
      this.database = db

      this._connections[this.connectionString] = this

      if (!this.connectionOptions.username || !this.connectionOptions.password) {
        // return this.emit('connect', this.database)
        return resolve()
      }

      this.database.authenticate(this.connectionOptions.username, this.connectionOptions.password, (err) => {
        if (err) {
          return reject(err)
        }
      // self.emit('connect', self.db)
        return resolve()
      })
  // })
    // return resolve()
    })
  })
}

/**
 * Query the database
 *
 * @param {Object} query - the query to perform
 * @param {string} collection - the name of the collection to query
 * @param {QueryOptions} options - a set of query options, such as offset, limit, sort, fields
 * @param {Object} schema - the JSON schema for the collection
 * @returns {Promise.<Array, Error>} A promise that returns an Array of results,
 *     or an Error if the operation fails
 */
DataStore.prototype.find = function ({ query, collection, options = {}, schema, settings }) {
  query = this.prepareQuery(query, schema)

  debug('find in %s %o %o', collection, query, options)

  return new Promise((resolve, reject) => {
    // have we been passed an aggregation pipeline query?
    if (Array.isArray(query)) {
      this.database.collection(collection).aggregate(query, options, (err, result) => {
        if (err) return reject(err)
        return resolve(result)
      })
    } else {
      this.database.collection(collection).find(query, options, (err, cursor) => {
        if (err) return reject(err)

        cursor.count().then(count => {
          cursor.toArray((err, result) => {
            if (err) return reject(err)

            const returnData = {
              results: result,
              metadata: this.getMetadata(options, count)
            }

            return resolve(returnData)
          })
        })
      })
    }
  })
}

/**
 * Insert documents into the database
 *
 * @param {Object|Array} data - a single document or an Array of documents to insert
 * @param {string} collection - the name of the collection to insert into
 * @param {object} options - options to modify the query
 * @param {Object} schema - the JSON schema for the collection
 * @returns {Promise.<Array, Error>} A promise that returns an Array of inserted documents,
 *     or an Error if the operation fails
 */
DataStore.prototype.insert = function ({data, collection, options = {}, schema, settings = {}}) {
  debug('insert into %s %o', collection, data)

  // make an Array of documents if an Object has been provided
  if (!Array.isArray(data)) {
    data = [data]
  }

  // ObjectIDs
  data.forEach(doc => {
    doc = this.convertObjectIdsForSave(doc, schema)
  })

  return new Promise((resolve, reject) => {
    this.database.collection(collection).insertMany(data, options, (err, result) => {
      if (err) {
        return reject(err)
      }

      return resolve(result.ops)
    })
  })
}

/**
 * Update documents in the database
 *
 * @param {object} query - the query that selects documents for update
 * @param {string} collection - the name of the collection to update documents in
 * @param {object} update - the update for the documents matching the query
 * @param {object} options - options to modify the query
 * @param {object} schema - the JSON schema for the collection
 * @returns {Promise.<Array, Error>} A promise that returns an Array of updated documents,
 *     or an Error if the operation fails
 */
DataStore.prototype.update = function ({query, collection, update, options = {}, schema}) {
  query = this.prepareQuery(query, schema)

  debug('update %s %o %o %o', collection, query, update, options)

  Object.assign(options, { returnOriginal: false, sort: [['_id', 'asc']], upsert: false })

  return new Promise((resolve, reject) => {
    this.database.collection(collection).updateMany(query, update, options).then(result => {
      return resolve({ matchedCount: result.matchedCount })
    }).catch((err) => {
      return reject(err)
    })
  })
}

/**
 * Remove documents from the database
 *
 * @param {Object} query - the query that selects documents for deletion
 * @param {string} collection - the name of the collection to delete from
 * @param {Object} schema - the JSON schema for the collection
 * @returns {Promise.<Array, Error>} A promise that returns an Object with one property `deletedCount`,
 *     or an Error if the operation fails
 */
DataStore.prototype.delete = function ({query, collection, schema}) {
  query = this.prepareQuery(query, schema)

  return new Promise((resolve, reject) => {
    this.database.collection(collection).deleteMany(query, (err, result) => {
      if (err) return reject(err)
      return resolve({ deletedCount: result.deletedCount })
    })
  })
}

/**
 * Get metadata about the specfied collection, including number of records
 *
 * @param {Object} options - the query options passed from API, such as page, limit, skip
 * @returns {Object} an object containing the metadata about the collection
 */
DataStore.prototype.stats = function (collection, options) {
  return new Promise((resolve, reject) => {
    this.database.collection(collection).stats(options, (err, stats) => {
      if (err) return reject(err)

      const result = {
        count: stats.count,
        size: stats.size,
        averageObjectSize: stats.avgObjSize,
        storageSize: stats.storageSize,
        indexes: stats.nindexes,
        totalIndexSize: stats.totalIndexSize,
        indexSizes: stats.indexSizes
      }

      return resolve(result)
    })
  })
}

/**
 *
 * @param {Object} options - the query options passed from API, such as page, limit, skip
 * @param {number} count - the number of results returned in the query
 * @returns {Object} an object containing the metadata for the query, such as totalPages, totalCount
 */
DataStore.prototype.getMetadata = function (options, count) {
  return metadata(options, count)
}

/**
 *
 */
DataStore.prototype.index = function (collection, indexes) {
  return new Promise((resolve, reject) => {
    // Create an index on the specified field(s)
    let results = []

    indexes.forEach((index, idx) => {
      if (Object.keys(index.keys).length === 1 && Object.keys(index.keys)[0] === '_id') {
        // ignore _id index request, db handles this automatically
      } else {
        this.database.createIndex(collection,
          index.keys,
          index.options,
          (err, indexName) => {
            if (err) return reject(err)
            results.push({
              collection: collection,
              index: indexName
            })

            if (idx === indexes.length - 1) {
              return resolve(results)
            }
          }
        )
      }
    })
  })
}

/**
 * Get an array of indexes
 *
 * @param {string} collectionName - the name of the collection to get indexes for
 * @returns {Array} - an array of index objects, each with a name property
 */
DataStore.prototype.getIndexes = function (collectionName) {
  return new Promise((resolve, reject) => {
    this.database.collection(collectionName).indexes((err, indexes) => {
      if (err) return reject(err)
      return resolve(indexes)
    })
  })
}

/**
 *
 */
DataStore.prototype.prepareQuery = function (query, schema) {
  // sanitise regex queries
  Object.keys(query).forEach(key => {
    if (Object.prototype.toString.call(query[key]) === '[object RegExp]') {
      query[key] = { '$regex': new RegExp(query[key]) }
    }
  })

  // process query operators
  Object.keys(query).filter(key => {
    return query[key] !== null && query[key].toString() === '[object Object]'
  }).forEach(key => {
    Object.keys(query[key]).forEach(subKey => {
      // replace a $containsAny query with $in
      if (subKey === '$containsAny') {
        query[key]['$in'] = query[key][subKey]
        delete query[key][subKey]
      }
    })
  })

  query = this.createObjectIdFromString(query, schema)

  return query
}

/**
 * Modify the query for MongoDB
 *
 * @param {Object} query - the MongoDB query to perform
 * @param {Object} schema - a collection schema
 */
DataStore.prototype.createObjectIdFromString = function (query, schema) {
  Object.keys(query).forEach((key) => {
    if (/apiVersion/.test(key)) {
      return
    }

    const fieldSettings = getSchemaOrParent(key, schema)
    const type = fieldSettings ? fieldSettings.type : undefined

    if (key === '$in') {
      if (typeof query[key] === 'object' && Array.isArray(query[key])) {
        let arr = query[key]

        arr.forEach((value, key) => {
          if (typeof value === 'string' && ObjectID.isValid(value) && value.match(/^[a-fA-F0-9]{24}$/)) {
            arr[key] = ObjectID.createFromHexString(value)
          }
        })

        query[key] = arr
      }
    } else if (typeof query[key] === 'object' && query[key] !== null) {
      if (typeof type !== 'undefined' && /^Mixed|Object$/.test(type)) {
        // ignore
      } else if (typeof type === 'undefined' || type !== 'Reference') { // Don't convert query id when it's a Reference field
        query[key] = this.createObjectIdFromString(query[key], schema)
      }
    } else if (typeof query[key] === 'string' && !/^Reference|Mixed|Object$/.test(type) && ObjectID.isValid(query[key]) && query[key].match(/^[a-fA-F0-9]{24}$/)) {
      query[key] = ObjectID.createFromHexString(query[key])
    }
  })

  return query
}

DataStore.prototype.convertObjectIdsForSave = function (obj, schema) {
  // let keys = Object.keys(schema).filter((key) => { return schema[key].type === 'ObjectID' })
  // keys.push('_id')

  Object.keys(obj).forEach((key) => {
    const fieldSettings = getSchemaOrParent(key, schema)
    const type = fieldSettings ? fieldSettings.type : undefined

    if (typeof obj[key] === 'object' && Array.isArray(obj[key])) {
      let arr = obj[key]

      arr.forEach((value, key) => {
        if (typeof value === 'string' && type === 'ObjectID' && ObjectID.isValid(value) && value.match(/^[a-fA-F0-9]{24}$/)) {
          arr[key] = ObjectID.createFromHexString(value)
        }
      })

      obj[key] = arr
    } else if (typeof obj[key] === 'string' && type === 'ObjectID' && ObjectID.isValid(obj[key]) && obj[key].match(/^[a-fA-F0-9]{24}$/)) {
      obj[key] = ObjectID.createFromHexString(obj[key])
    }
  })

  return obj
}

/**
 * Returns the type of field, allowing for dot notation in queries.
 * If dot notation is used, the first part of the key is used to
 * determine the field type from the schema
 */
function getSchemaOrParent (key, schema) {
  // use the key as specified or the first part after splitting on '.'
  const keyOrParent = (key.split('.').length > 1) ? key.split('.')[0] : key

  if (schema[keyOrParent]) {
    return schema[keyOrParent]
  }
}

/**
 * Takes object and casts fields to BSON types as per this model's schema
 *
 * @param {object} obj
 * @return undefined
 * @api private
 */
DataStore.prototype.castToBSON = function (obj) {
  // TODO: Do we need to handle casting for all fields, or will `_id` be the only BSON specific type?
  //      this is starting to enter ODM land...
  if (typeof obj._id === 'string' && ObjectID.isValid(obj._id) && obj._id.match(/^[a-fA-F0-9]{24}$/)) {
    obj._id = ObjectID.createFromHexString(obj._id)
  }
}

/**
 *
 */
DataStore.prototype.getConnectionOptions = function (overrideOptions) {
  overrideOptions = overrideOptions || {}

  debug('connection override options %o', overrideOptions)

  let connectionOptions = Object.assign({}, this.config)

  const allowOverride = (this.config.enableCollectionDatabases || overrideOptions.override) &&
    (overrideOptions.database &&
    overrideOptions.database !== connectionOptions.databaase)

  // override ok and config block exists with the specified database key
  if (allowOverride && this.config[overrideOptions.database]) {
    connectionOptions = Object.assign(connectionOptions, { database: overrideOptions.database }, this.config[overrideOptions.database])
  }

  debug('connectionOptions %o', connectionOptions)

  // required config fields
  if (!(connectionOptions.hosts && connectionOptions.hosts.length)) {
    throw new Error('`hosts` Array is required for Connection')
  }

  return connectionOptions
}

/**
 *
 */
DataStore.prototype.constructConnectionString = function (options) {
  let connectionOptions = Object.assign({
    options: {}
  }, options)

  if (options.replicaSet && options.replicaSet !== 'false') {
    connectionOptions.options['replicaSet'] = options.replicaSet
  }

  if (options.ssl) connectionOptions.options['ssl'] = options.ssl
  if (options.maxPoolSize) connectionOptions.options['maxPoolSize'] = options.maxPoolSize
  if (options.readPreference) connectionOptions.options['readPreference'] = options.readPreference

  const credentials = this.credentials(connectionOptions)
  const hosts = this.hosts(connectionOptions.hosts)
  const optionsString = this.encodeOptions(connectionOptions.options)

  return `mongodb://${credentials}${hosts}/${connectionOptions.database}${optionsString}`
}

/**
 * Returns a querystring encoded string containing the specified options
 */
DataStore.prototype.encodeOptions = function (options) {
  if (!options || Object.keys(options).length === 0) return ''
  return '?' + qs.encode(options)
}

/**
 * Returns a string derived from an array of hosts
 */
DataStore.prototype.hosts = function (hosts) {
  return hosts.map((host) => { return host.host + ':' + (host.port || 27017) }).join(',')
}

/**
 * Returns database credentials as a string for inserting into the connection string
 */
DataStore.prototype.credentials = function (options) {
  if (!options.username || !options.password) {
    return ''
  } else {
    return options.username + ':' + options.password + '@'
  }
}

DataStore.prototype.dropDatabase = function (collectionName) {
  debug('dropDatabase %s', collectionName || '')

  return new Promise((resolve, reject) => {
    if (this.database && this.database.databaseName.indexOf('test') > -1) {
      this.database.dropDatabase((err) => {
        if (err) return reject(err)
        return resolve()
      })
    } else {
      return reject(new Error('Database not loaded'))
    }
  })
}

module.exports = DataStore

/*
// mongoClient.connect(this.connectionString, function (err, db) {
//   if (err) {
//     self.readyState = 0
//     return self.emit('error', err)
//   }

  // self.readyState = 1
  // self.db = db
  // self.db = datastore

  // _connections[self.connectionOptions.database] = self
  //
  // if (!self.connectionOptions.username || !self.connectionOptions.password) {
  // return this.emit('connect', this.db)
  // }
  //
  // self.db.authenticate(self.connectionOptions.username, self.connectionOptions.password, function (err) {
  //   if (err) return self.emit('error', err)
  //   self.emit('connect', self.db)
  // })
// })
*/
