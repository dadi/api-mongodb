'use strict'

const config = require('../config')
const debug = require('debug')('api:mongodb')
const EventEmitter = require('events').EventEmitter
const metadata = require('@dadi/metadata')
const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient
const ObjectID = require('mongodb').ObjectID
const packageManifest = require('../package.json')
const qs = require('querystring')
const util = require('util')

const STATE_CONNECTED = 1
const STATE_CONNECTING = 2
const STATE_DISCONNECTED = 0

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
 * @property {Object} sort - an object specifying properties to sort by.
 *  `{"title": 1}` will sort the results by the `title` property in ascending
 *  order. To reverse the sort, use `-1`: `{"title": -1}`
 * @property {Object} fields - an object specifying which properties to return.
 *  `{"title": 1}` will return results with all properties removed except for
 *  `_id` and `title`
 */

/**
 * Handles the interaction with MongoDB
 * @constructor DataStore
 * @classdesc DataStore adapter for using MongoDB with DADI API
 * @implements EventEmitter
 */
const DataStore = function DataStore() {
  this._connections = []
  this._mongoClient = new MongoClient()

  this.config = config

  this.readyState = STATE_DISCONNECTED
}

util.inherits(DataStore, EventEmitter)

/**
 * Connect to the database
 *
 * @param {ConnectionOptions} options
 */
DataStore.prototype.connect = function(options) {
  const databaseBlock = this.getDatabaseOptions(options)
  const connectionString = this.getConnectionString(databaseBlock)

  debug('connect %s %o', connectionString, options)

  // If a connection exists for the specified database, return it.
  if (this._connections[connectionString]) {
    return this._connections[connectionString]
  }

  return new Promise((resolve, reject) => {
    this._mongoClient.connect(connectionString, (err, db) => {
      if (err) {
        this.readyState = STATE_DISCONNECTED

        return reject(err)
      }

      db.on('error', err => {
        this.readyState = STATE_DISCONNECTED

        this.emit('DB_ERROR', err)
      })

      db.on('timeout', err => {
        this.readyState = STATE_DISCONNECTED

        this.emit('DB_ERROR', err)
      })

      db.on('close', err => {
        this.readyState = STATE_DISCONNECTED

        this.emit('DB_ERROR', err)
      })

      db.on('reconnect', () => {
        this.readyState = STATE_CONNECTED

        this.emit('DB_RECONNECTED')
      })

      this.readyState = STATE_CONNECTING
      this.database = db

      this._connections[connectionString] = this

      this.readyState = STATE_CONNECTED
      this.emit('DB_CONNECTED', this.database)

      return resolve()
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
DataStore.prototype.find = function({query, collection, options = {}, schema}) {
  if (this.readyState !== STATE_CONNECTED) {
    return Promise.reject(new Error('DB_DISCONNECTED'))
  }

  return new Promise((resolve, reject) => {
    // have we been passed an aggregation pipeline query?
    if (Array.isArray(query)) {
      debug('aggregate in %s %o %o', collection, JSON.stringify(query), options)

      this.database
        .collection(collection)
        .aggregate(query, options, (err, result) => {
          if (err) return reject(err)

          return resolve(result)
        })
    } else {
      query = this.prepareQuery(query, schema)

      debug('find in %s %o %o', collection, query, options)

      this.database
        .collection(collection)
        .find(query, options, (err, cursor) => {
          if (err) return reject(err)

          cursor
            .count()
            .then(count => {
              cursor.toArray((err, result) => {
                if (err) return reject(err)

                const returnData = {
                  results: result.map(document => {
                    if (document._id) {
                      document._id = document._id.toString()
                    }

                    return document
                  }),
                  metadata: this.getMetadata(options, count)
                }

                return resolve(returnData)
              })
            })
            .catch(error => {
              if (error.code === 2) {
                return reject(new Error('BAD_QUERY'))
              }

              return reject(error)
            })
        })
    }
  })
}

/**
 * Responds to API with information about the data connector module.
 *
 * @return {Object}
 */
DataStore.prototype.handshake = function() {
  return {
    version: packageManifest.version
  }
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
DataStore.prototype.insert = function({
  data,
  collection,
  options = {},
  schema
}) {
  if (this.readyState !== STATE_CONNECTED) {
    return Promise.reject(new Error('DB_DISCONNECTED'))
  }

  debug('insert into %s %o', collection, data)

  // Make an Array of documents if a single document has been provided.
  if (!Array.isArray(data)) {
    data = [data]
  }

  if (data.length === 0) {
    return Promise.resolve([])
  }

  // ObjectIDs
  data = data.map(doc => {
    return this.convertObjectIdsForSave(doc, schema)
  })

  return new Promise((resolve, reject) => {
    this.database
      .collection(collection)
      .insertMany(data, options, (err, result) => {
        if (err) {
          return reject(err)
        }

        return resolve(
          result.ops.map(document => {
            if (document._id) {
              document._id = document._id.toString()
            }

            return document
          })
        )
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
DataStore.prototype.update = function({
  query,
  collection,
  update,
  options = {},
  schema
}) {
  if (this.readyState !== STATE_CONNECTED) {
    return Promise.reject(new Error('DB_DISCONNECTED'))
  }

  query = this.prepareQuery(query, schema)

  debug('update %s %o %o %o', collection, query, update, options)

  Object.assign(options, {
    returnOriginal: false,
    sort: [['_id', 'asc']],
    upsert: false
  })

  return new Promise((resolve, reject) => {
    this.database
      .collection(collection)
      .updateMany(query, update, options)
      .then(result => {
        return resolve({matchedCount: result.matchedCount})
      })
      .catch(err => {
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
DataStore.prototype.delete = function({query, collection, schema}) {
  if (this.readyState !== STATE_CONNECTED) {
    return Promise.reject(new Error('DB_DISCONNECTED'))
  }

  query = this.prepareQuery(query, schema)

  debug('delete %s %o %o %o', collection, query)

  return new Promise((resolve, reject) => {
    this.database.collection(collection).deleteMany(query, (err, result) => {
      if (err) return reject(err)

      return resolve({deletedCount: result.deletedCount})
    })
  })
}

/**
 * Get metadata about the specfied collection, including number of records
 *
 * @param {Object} options - the query options passed from API, such as page, limit, skip
 * @returns {Object} an object containing the metadata about the collection
 */
DataStore.prototype.stats = function(collection, options) {
  if (this.readyState !== STATE_CONNECTED) {
    return Promise.reject(new Error('DB_DISCONNECTED'))
  }

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
DataStore.prototype.getMetadata = function(options, count) {
  return metadata(options, count)
}

/**
 *
 */
DataStore.prototype.index = function(collection, indexes) {
  return new Promise((resolve, reject) => {
    // Create an index on the specified field(s)
    const results = []

    indexes.forEach((index, idx) => {
      if (
        Object.keys(index.keys).length === 1 &&
        Object.keys(index.keys)[0] === '_id'
      ) {
        // ignore _id index request, db handles this automatically
      } else {
        this.database.createIndex(
          collection,
          index.keys,
          index.options,
          (err, indexName) => {
            if (err) return reject(err)

            results.push({
              collection,
              index: indexName
            })

            if (idx === indexes.length - 1) {
              return resolve()
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
DataStore.prototype.getIndexes = function(collectionName) {
  return new Promise((resolve, reject) => {
    this.database.collection(collectionName).indexes((err, indexes) => {
      if (err) return reject(err)

      const response = []

      indexes.forEach(index => {
        const field = index.key && Object.keys(index.key)[0]

        if (!field || field === '_id') return

        response.push({
          name: field
        })
      })

      return resolve(response)
    })
  })
}

/**
 *
 */
DataStore.prototype.prepareQuery = function(query) {
  // sanitise regex queries
  Object.keys(query).forEach(key => {
    if (Object.prototype.toString.call(query[key]) === '[object RegExp]') {
      query[key] = {$regex: new RegExp(query[key])}
    }
  })

  // process query operators
  Object.keys(query)
    .filter(key => {
      return (
        query[key] &&
        typeof query[key] !== 'undefined' &&
        query[key].toString() === '[object Object]'
      )
    })
    .forEach(key => {
      Object.keys(query[key]).forEach(subKey => {
        // replace a $containsAny query with $in
        if (subKey === '$containsAny') {
          query[key]['$in'] = query[key][subKey]
          delete query[key][subKey]
        }
      })
    })

  query = this.createObjectIdFromString(query)

  return query
}

/**
 * Modify the query for MongoDB
 *
 * @param {Object} query - the MongoDB query to perform
 */
DataStore.prototype.createObjectIdFromString = function(query) {
  // We're only interested in converting string IDs to ObjectID when we're
  // running queries against _id.
  if (!query._id) return query

  if (typeof query._id === 'string' && ObjectID.isValid(query._id)) {
    query._id = ObjectID.createFromHexString(query._id)
  } else if (typeof query._id === 'object') {
    query._id = Object.keys(query._id).reduce((newQuery, operator) => {
      let value = query._id[operator]

      if (Array.isArray(value)) {
        value = value.map(childValue => {
          if (typeof childValue === 'string' && ObjectID.isValid(childValue)) {
            return ObjectID.createFromHexString(childValue)
          }

          return childValue
        })
      } else if (typeof value === 'string') {
        value = ObjectID.isValid(value)
          ? ObjectID.createFromHexString(value)
          : value
      }

      newQuery[operator] = value

      return newQuery
    }, {})
  }

  return query
}

DataStore.prototype.convertObjectIdsForSave = function(obj, schema) {
  Object.keys(obj).forEach(key => {
    const fieldSettings = getSchemaOrParent(key, schema)
    const type = fieldSettings ? fieldSettings.type : undefined

    if (typeof obj[key] === 'object' && Array.isArray(obj[key])) {
      const arr = obj[key]

      arr.forEach((value, key) => {
        if (
          typeof value === 'string' &&
          type === 'ObjectID' &&
          ObjectID.isValid(value) &&
          value.match(/^[a-fA-F0-9]{24}$/)
        ) {
          arr[key] = ObjectID.createFromHexString(value)
        }
      })

      obj[key] = arr
    } else if (
      typeof obj[key] === 'string' &&
      type === 'ObjectID' &&
      ObjectID.isValid(obj[key]) &&
      obj[key].match(/^[a-fA-F0-9]{24}$/)
    ) {
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
function getSchemaOrParent(key, schema) {
  // use the key as specified or the first part after splitting on '.'
  const keyOrParent = key.split('.').length > 1 ? key.split('.')[0] : key

  if (schema && schema[keyOrParent]) {
    return schema[keyOrParent]
  }
}

/**
 * Returns the configuration block for the database to be used.
 *
 * @param {Object} database - Name of the database coming from the request URL
 * @param {Object} override - Whether to use `database` as the database to
 *  connect to, as opposed to using the default database.
 */
DataStore.prototype.getDatabaseOptions = function({database, override} = {}) {
  const databases = config.get('databases')
  const databaseBlock = databases.find(({default: isDefault, id}) => {
    if (override && database) {
      return id === database
    }

    return isDefault || databases.length === 1
  })

  if (!databaseBlock || !databaseBlock.hosts || !databaseBlock.hosts.length) {
    throw new Error(`Configuration missing for database '${database}'`)
  }

  return databaseBlock
}

/**
 * Builds a connection string from a database block and its name.
 */
DataStore.prototype.getConnectionString = function({
  authDatabase,
  authMechanism,
  hosts,
  id,
  maxPoolSize,
  password,
  readPreference,
  replicaSet,
  ssl,
  username
}) {
  let credentials = ''
  const options = {}

  if (maxPoolSize) {
    options.maxPoolSize = maxPoolSize
  }

  if (readPreference) {
    options.readPreference = readPreference
  }

  if (replicaSet) {
    options.replicaSet = replicaSet
  }

  if (ssl === true) {
    options.ssl = ssl
  }

  if (username && password) {
    credentials = `${username}:${password}@`

    if (authDatabase) {
      options.authDatabase = authDatabase
    }

    if (authMechanism) {
      options.authMechanism = authMechanism
    }
  }

  const encodedOptions =
    Object.keys(options).length > 0 ? `?${qs.encode(options)}` : ''
  const connectionString = `mongodb://${credentials}${hosts}/${id}${encodedOptions}`

  return connectionString
}

DataStore.prototype.dropDatabase = function(collectionName) {
  if (this.readyState !== STATE_CONNECTED) {
    return Promise.reject(new Error('DB_DISCONNECTED'))
  }

  if (collectionName) {
    return new Promise((resolve, reject) => {
      this.database.collection(collectionName).drop({}, err => {
        if (err) {
          if (err.codeName === 'NamespaceNotFound') {
            return resolve()
          }

          return reject(err)
        }

        return resolve()
      })
    })
  }

  return new Promise((resolve, reject) => {
    this.database.dropDatabase(err => {
      if (err) return reject(err)

      return resolve()
    })
  })
}

module.exports = DataStore
