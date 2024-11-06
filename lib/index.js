const Debug = require('debug')
const {EventEmitter} = require('events')
const metadata = require('@dadi/metadata')
const mongodb = require('mongodb')
const config = require('../config.js')
const packageJson = require('../package.json')

/**
 * @typedef ConnectionParams
 * @type {Object}
 * @property {string|undefined} database
 * @property {boolean|undefined} override
 */

/**
 * @typedef DatabaseConfig
 * @type {Object}
 * @property {string|undefined} authDatabase
 * @property {string|undefined} authMechanism
 * @property {string|undefined} hosts
 * @property {string} id
 * @property {number|undefined} maxPoolSize
 * @property {string|undefined} password
 * @property {string|undefined} readPreference
 * @property {string|undefined} replicaSet
 * @property {boolean|undefined} ssl
 * @property {string|undefined} username
 */

/**
 * @typedef DeleteParams
 * @type {Object}
 * @property {string} collection
 * @property {mongodb.BSON.Document} query
 * @property {unknown} schema
 */

/**
 * @typedef DeleteResult
 * @type {Object}
 * @property {number} deletedCount
 */

/**
 * @typedef FindAggregateParams
 * @type {Object}
 * @property {string} collection
 * @property {mongodb.AggregateOptions|undefined} options
 * @property {Array<mongodb.BSON.Document>} query
 * @property {unknown} schema
 */

/**
 * @typedef FindAggregateResult
 * @type {Array<mongodb.BSON.Document>}
 */

/**
 * @typedef FindParams
 * @type {Object}
 * @property {string} collection
 * @property {mongodb.FindOptions|undefined} options
 * @property {mongodb.Filter<mongodb.BSON.Document>} query
 * @property {unknown} schema
 */

/**
 * @typedef FindResult
 * @type {Object}
 * @property {Array<mongodb.BSON.Document>} results
 * @property {FindResultMetadata} metadata
 */

/**
 * @typedef FindResultMetadata
 * @type {mongodb.FindOptions & { totalCount: number }}
 */

/**
 * @typedef GetIndexesResult
 * @type {Array<{ name: string }>}
 */

/**
 * @typedef HandshakeResult
 * @type {Object}
 * @property {string} version
 */

/**
 * @typedef Index
 * @type {Object}
 * @property {mongodb.IndexSpecification} keys
 * @property {mongodb.CreateIndexesOptions|undefined} options
 */

/**
 * @typedef IndexResult
 * @type {Array<{ collection: string, index: string }>}
 */

/**
 * @typedef InsertParams
 * @type {Object}
 * @property {string} collection
 * @property {mongodb.BSON.Document|Array<mongodb.BSON.Document>} data
 * @property {mongodb.BulkWriteOptions} options
 * @property {unknown} schema
 */

/**
 * @typedef InsertResult
 * @type {Array<mongodb.BSON.Document>}
 */

/**
 * @typedef StatsResult
 * @type {Object}
 * @property {number} averageObjectSize
 * @property {number} count
 * @property {Record<string, number>} indexSizes
 * @property {number} indexes
 * @property {number} maxPoolSize
 * @property {number} storageSize
 * @property {number} totalIndexSize
 */

/**
 * @typedef UpdateParams
 * @type {Object}
 * @property {string} collection
 * @property {mongodb.UpdateOptions} options
 * @property {mongodb.Filter<mongodb.BSON.Document>} query
 * @property {unknown} schema
 * @property {mongodb.BSON.Document>} update
 */

/**
 * @typedef UpdateResult
 * @type {Object}
 * @property {number} matchedCount
 */

const STATE_CONNECTED = 1
const STATE_DISCONNECTED = 0

const debug = Debug('api:mongodb')

/**
 * Convert (or normalise) a document's ObjectId to a string.
 *
 * @param {mongodb.WithId<mongodb.BSON.Document>} document
 * @returns {mongodb.BSON.Document}
 */
function convertDocumentObjectIdToString(document) {
  if (document._id) document._id = document._id.toString()
  return document
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

class DataStore extends EventEmitter {
  #connectionString = ''

  /** @property {mongodb.MongoClient} */
  #client
  /** @property {mongodb.Db} */
  #db

  readyState = STATE_DISCONNECTED

  constructor() {
    super()
  }

  /**
   * Close the connection.
   *
   * @param {Error|undefined} err
   */
  #close(err) {
    this.readyState = STATE_DISCONNECTED
    if (err) this.emit('DB_ERROR', err)
  }

  /**
   * Initialise a MongoDB connection.
   *
   * @param {string} connStr Connection string
   */
  #open(connStr) {
    this.#client = new mongodb.MongoClient(connStr)
    this.#db = this.#client.db()

    this.#client.on('close', this.#close.bind(this))
    this.#client.on('error', this.#close.bind(this))
    this.#client.on('timeout', this.#close.bind(this))

    this.readyState = STATE_CONNECTED
    this.emit('DB_CONNECTED', this.#client)
  }

  /**
   * Connect to MongoDB.
   *
   * @see https://github.com/dadi/api-connector-template?tab=readme-ov-file#connectdatabase-collection
   *
   * @param {ConnectionParams|undefined} options
   * @returns {Promise<DataStore>}
   */
  async connect(options) {
    const dbOptions = this.getDatabaseOptions(options)
    const connStr = this.getConnectionString(dbOptions)

    if (connStr !== this.#connectionString) {
      this.#open(connStr)
      this.#connectionString = connStr
    }

    return this
  }

  /**
   * Getter for database.
   * This is mainly for testing and SHOULD NOT be accessed by DADI API or any other client.
   */
  get database() {
    return this.#db
  }

  /**
   * Delete documents from the database.
   *
   * @see https://github.com/dadi/api-connector-template?tab=readme-ov-file#deletequery-collection-schema
   *
   * @param {DeleteParams} params
   * @returns {Promise<DeleteResult>}
   */
  async delete(params) {
    if (this.readyState !== STATE_CONNECTED) throw new Error('DB_DISCONNECTED')

    let query = params.query
    const {collection} = params

    query = this.prepareQuery(query)
    debug('delete %s %o', collection, query)

    const result = await this.#db.collection(collection).deleteMany(query)
    return {
      deletedCount: result.deletedCount,
    }
  }

  /**
   * Drop a collection.
   *
   * @param {string} collection
   * @returns {Promise<void>}
   */
  async dropCollection(collection) {
    if (this.readyState !== STATE_CONNECTED) throw new Error('DB_DISCONNECTED')

    await this.#db.dropCollection(collection)
  }

  /**
   * Drop the database.
   * If a collection is provided, only that collection will be dropped, instead.
   *
   * @see https://github.com/dadi/api-connector-template?tab=readme-ov-file#dropdatabasecollection
   *
   * @param {string|null|undefined} collection
   * @returns {Promise<void>}
   */
  async dropDatabase(collection) {
    if (collection) return this.dropCollection(collection)

    if (this.readyState !== STATE_CONNECTED) throw new Error('DB_DISCONNECTED')

    await this.#db.dropDatabase()
    this.#close()
  }

  /**
   * Query the database.
   * This method handles both aggregation (if `params.query` is an array) and find operation.
   *
   * @see https://github.com/dadi/api-connector-template?tab=readme-ov-file#find-query-collection-options---schema-settings-
   *
   * @param {FindAggregateParams|FindParams} params
   * @returns {Promise<FindAggregateResult|FindResult>}
   */
  async find(params) {
    if (this.readyState !== STATE_CONNECTED) throw new Error('DB_DISCONNECTED')

    let query = params.query
    const {collection, options = {}, schema} = params

    // Patch fields -> projection for current MongoDB driver
    // See https://mongodb.github.io/node-mongodb-native/6.10/interfaces/FindOptions.html#projection
    const mongoOptions = {...options}
    if (mongoOptions.fields) {
      mongoOptions.projection = mongoOptions.fields
      delete mongoOptions.fields
    }

    // Handle array query as aggregation
    if (Array.isArray(query)) {
      debug('aggregate in %s %o %o', collection, query, options)

      const cursor = this.#db
        .collection(collection)
        .aggregate(query, mongoOptions)
      return cursor.toArray()
    }

    // Handle object query as find
    query = this.prepareQuery(query, schema)
    debug('find in %s %o %o', collection, query, options)

    try {
      const count = await this.#db.collection(collection).countDocuments(query)
      const cursor = this.#db.collection(collection).find(query, mongoOptions)
      const documents = await cursor.toArray()

      return {
        results: documents.map(convertDocumentObjectIdToString),
        metadata: metadata(options, count),
      }
    } catch (err) {
      if (err.code === 2) throw new Error('BAD_QUERY')
      throw err
    }
  }

  /**
   * Get indexes for a database collection.
   *
   * @see https://github.com/dadi/api-connector-template?tab=readme-ov-file#getindexescollection
   *
   * @param {string} collection
   * @return {Promise<GetIndexesResult>}
   */
  async getIndexes(collection) {
    const result = []

    const indexes = await this.#db.collection(collection).indexes()
    for (const index of indexes) {
      const name = index.key && Object.keys(index.key)[0]
      if (!name || name === '_id') continue

      result.push({name})
    }

    return result
  }

  /**
   * Provide connector information.
   *
   * @return {HandshakeResult}
   */
  handshake() {
    return {
      version: packageJson.version,
    }
  }

  /**
   * Create indexes for a database collection.
   *
   * @see https://github.com/dadi/api-connector-template?tab=readme-ov-file#indexcollection-indexes
   *
   * @param {string} collection
   * @param {Array<Index>} indexes
   * @returns {Promise<IndexResult>}
   */
  async index(collection, indexes) {
    const results = []

    for (const index of indexes) {
      const keys = Object.keys(index.keys)

      // Ignore indexes for _id only, MongoDB handles this automatically
      if (keys.length === 1 && keys[0] === '_id') continue

      const name = await this.#db.createIndex(
        collection,
        index.keys,
        index.options,
      )
      results.push({collection, index: name})
    }

    return results
  }

  /**
   * Insert documents into the database.
   *
   * @see https://github.com/dadi/api-connector-template?tab=readme-ov-file#insertdata-collection-options---schema-settings--
   *
   * @param {InsertParams} params
   * @returns {Promise<InsertResult>}
   */
  async insert(params) {
    if (this.readyState !== STATE_CONNECTED) throw new Error('DB_DISCONNECTED')

    let data = params.data
    const {collection, options, schema} = params

    debug('insert into %s %o', collection, data)

    // Coerce array insert
    if (!Array.isArray(data)) data = [data]
    if (data.length === 0) return []

    data = data.map((doc) => this.convertObjectIdsForSave(doc, schema))

    const result = await this.#db
      .collection(collection)
      .insertMany(data, options)

    // Reload all newly written documents for return
    const documents = await this.#db
      .collection(collection)
      .find({_id: {$in: Object.values(result.insertedIds)}})
      .toArray()
    return documents.map(convertDocumentObjectIdToString)
  }

  /**
   * Get collection statistics.
   *
   * @see https://github.com/dadi/api-connector-template?tab=readme-ov-file#statscollection-options
   *
   * @param {string} collection
   * @returns {Promise<StatsResult>}
   */
  async stats(collection) {
    if (this.readyState !== STATE_CONNECTED) throw new Error('DB_DISCONNECTED')

    const agg = [
      {
        $collStats: {
          storageStats: {},
        },
      },
    ]

    const result = await this.#db
      .collection(collection)
      .aggregate(agg)
      .toArray()
    if (result.length < 1) throw new Error('BAD_QUERY')

    const stats = result[0].storageStats

    return {
      count: stats.count,
      size: stats.size,
      averageObjectSize: stats.avgObjectSize,
      storageSize: stats.storageSize,
      indexes: stats.nindexes,
      totalIndexSize: stats.totalIndexSize,
      indexSizes: stats.indexSizes,
    }
  }

  /**
   * Update documents in the database.
   *
   * @see https://github.com/dadi/api-connector-template?tab=readme-ov-file#updatequery-collection-update-options---schema
   *
   * @param {UpdateParams} params
   * @returns {Promise<UpdateResult>}
   */
  async update(params) {
    if (this.readyState !== STATE_CONNECTED) throw new Error('DB_DISCONNECTED')

    let query = params.query
    const {collection, options = {}, schema, update} = params

    query = this.prepareQuery(query, schema)
    debug('update %s %o %o %o', collection, query, update, options)

    options.returnOriginal = false
    options.sort = [['_id', 'asc']]
    options.upsert = false

    const result = await this.#db
      .collection(collection)
      .updateMany(query, update, options)
    return {
      matchedCount: result.matchedCount,
    }
  }

  /********************
   *                  *
   * HELPER FUNCTIONS *
   *                  *
   ********************/

  /**
   * Convert document IDs from strings to ObjectId during a save operation.
   *
   * @param {mongodb.BSON.Document} obj
   * @param {unknown} schema
   * @returns {mongodb.BSON.Document}
   */
  convertObjectIdsForSave(obj, schema) {
    Object.keys(obj).forEach((key) => {
      const fieldSettings = getSchemaOrParent(key, schema)
      const type = fieldSettings ? fieldSettings.type : undefined

      if (typeof obj[key] === 'object' && Array.isArray(obj[key])) {
        const arr = obj[key]

        arr.forEach((value, key) => {
          if (
            typeof value === 'string' &&
            type === 'ObjectID' &&
            mongodb.ObjectId.isValid(value) &&
            value.match(/^[a-fA-F0-9]{24}$/)
          ) {
            arr[key] = mongodb.ObjectId.createFromHexString(value)
          }
        })

        obj[key] = arr
      } else if (
        typeof obj[key] === 'string' &&
        type === 'ObjectID' &&
        mongodb.ObjectId.isValid(obj[key]) &&
        obj[key].match(/^[a-fA-F0-9]{24}$/)
      ) {
        obj[key] = mongodb.ObjectId.createFromHexString(obj[key])
      }
    })

    return obj
  }

  /**
   * Convert _id strings to MongoDB ObjectIds in a query.
   * @param {mongodb.BSON.Document} query
   * @returns {mongodb.BSON.Document}
   */
  createObjectIdFromString(query) {
    // We're only interested in converting string IDs to ObjectID when we're
    // running queries against _id.
    if (!query._id) return query

    if (typeof query._id === 'string' && mongodb.ObjectId.isValid(query._id)) {
      query._id = mongodb.ObjectId.createFromHexString(query._id)
    } else if (typeof query._id === 'object') {
      query._id = Object.keys(query._id).reduce((newQuery, operator) => {
        let value = query._id[operator]

        if (Array.isArray(value)) {
          value = value.map((childValue) => {
            if (
              typeof childValue === 'string' &&
              mongodb.ObjectId.isValid(childValue)
            ) {
              return mongodb.ObjectId.createFromHexString(childValue)
            }

            return childValue
          })
        } else if (typeof value === 'string') {
          value = mongodb.ObjectId.isValid(value)
            ? mongodb.ObjectId.createFromHexString(value)
            : value
        }

        newQuery[operator] = value

        return newQuery
      }, {})
    }

    return query
  }

  /**
   * Create a MongoDB connection string.
   *
   * @param {DatabaseConfig|undefined} options
   * @returns {string}
   */
  getConnectionString(db) {
    let credentials = ''
    const qs = {}

    if (db.maxPoolSize) qs.maxPoolSize = db.maxPoolSize
    if (db.readPreference) qs.readPreference = db.readPreference
    if (db.replicaSet) qs.replicaSet = db.replicaSet
    if (db.ssl) qs.ssl = 'true'

    if (db.username && db.password) {
      credentials = `${db.username}:${db.password}@`

      if (db.authDatabase) qs.authSource = db.authDatabase
      if (db.authMechanism) qs.authMechanism = db.authMechanism
    }

    const qsEncoded = new URLSearchParams(qs).toString()
    let connStr = `mongodb://${credentials}${db.hosts}/${db.id}`
    if (qsEncoded.length > 0) connStr += `?${qsEncoded}`

    return connStr
  }

  /**
   * Get database configuration.
   *
   * @param {ConnectionParams|undefined} options
   * @returns {DatabaseConfig}
   */
  getDatabaseOptions(options = {}) {
    const databases = config.get('databases')

    const db = databases.find((db) => {
      if (options.override && options.database) {
        return db.id === options.database
      }

      return db.default || databases.length === 1
    })

    if (!db || !db.hosts) {
      throw new Error(
        `Configuration missing for database '${options.database}'`,
      )
    }

    return db
  }

  /**
   * Prepare a find query for use.
   *
   * @todo Discover whether this can be removed; standard MongoDB filters should be used at the call site wherever possible.
   * @todo Remove unused schema parameter.
   *
   * @param {mongodb.Filter<mongodb.BSON.Document>} query
   * @param {unknown} _schema
   * @returns {mongodb.Filter<mongodb.BSON.Document>}
   */
  prepareQuery(query, _schema) {
    // Sanitise regex queries
    Object.keys(query).forEach((key) => {
      if (Object.prototype.toString.call(query[key]) === '[object RegExp]') {
        query[key] = {$regex: new RegExp(query[key])}
      }
    })

    // Process query operators
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key].toString() !== '[object Object]') return

      // Replace $containsAny with $in
      if (query[key]['$containsAny']) {
        query[key]['$in'] = query[key]['$containsAny']
        delete query[key]['$containsAny']
      }
    })

    // Convert string IDs to ObjectId
    query = this.createObjectIdFromString(query)

    return query
  }
}

module.exports = DataStore
module.exports.STATE_CONNECTED = STATE_CONNECTED
module.exports.STATE_DISCONNECTED = STATE_DISCONNECTED
module.exports.convertDocumentObjectIdToString = convertDocumentObjectIdToString
