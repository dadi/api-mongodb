var debug = require('debug')('api:mongodb')
var mongodb = require('mongodb')
var MongoClient = mongodb.MongoClient
var path = require('path')
var qs = require('querystring')

/**
 *
 */
var DataStore = function (config) {
  debug('Initialising')

  this.config = config
  this._connections = []
  this._mongoClient = new MongoClient()

  // connection readyState
  // 0 = disconnected
  // 1 = connected
  // 2 = connecting
  // 3 = disconnecting
  this.readyState = 0
}

/**
 *
 */
DataStore.prototype.connect = function (options) {
  debug('connect %O', options)

  this.connectionOptions = this.getConnectionOptions(options)
  this.connectionString = this.constructConnectionString(this.connectionOptions)

  debug('connect %s', this.connectionString)

  // if a connection exists for the specified database, return it
  if (this._connections[this.connectionString]) {
    return _connections[this.connectionString]
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
        // return self.emit('error', err)
      }

      this.readyState = 1
      this.database = db

      this._connections[this.connectionString] = this

      if (!this.connectionOptions.username || !this.connectionOptions.password) {
        //return this.emit('connect', this.database)
        return resolve()
      }

      this.database.authenticate(this.connectionOptions.username, this.connectionOptions.password, (err) => {
      //if (err) return this.emit('error', err)
      //self.emit('connect', self.db)
        return resolve()
      })
  //})
    // return resolve()
    })
  })
}

/**
 * Query the database
 *
 * @param {Object} query - the MongoDB query to perform
 * @param {String} collection - the name of the collection to query
 * @param {Object} options - a set of query options, such as page, limit, sort
 */
DataStore.prototype.find = function (query, collection, options) {
  debug('find in %s %o %o', collection, query, options)

  return new Promise((resolve, reject) => {
    this.database.collection(collection).find(query, options, (err, cursor) => {
      cursor.toArray((err, result) => {
        if (err) return reject(err)

        return resolve(result)
      })
    })
  })
}

/**
 * Insert documents into the database
 *
 * @param {Object|Array} data - a single document or an Array of documents to insert
 * @param {String} collection - the name of the collection to insert into
 */
DataStore.prototype.insert = function (data, collection) {
  debug('insert into %s %o', collection, data)

  // make an Array of documents if an Object has been provided
  if (!Array.isArray(data)) {
    data = [data]
  }

  return new Promise((resolve, reject) => {
    this.database.collection(collection).insertMany(data, (err, result) => {
      if (err) {
        console.log(err)
      }

      return resolve(result.ops)
    })
  })
}

/**
 * Update documents in the database
 *
 * @param {Object} query - the MongoDB query that selects documents for update
 * @param {String} collection - the name of the collection to update documents in
 */
DataStore.prototype.update = function (query, collection, update, options) {
  return new Promise((resolve, reject) => {
    this.database.collection(collection).updateMany(query, update, options, (err, result) => {
      return resolve({ matchedCount: result.matchedCount })
    })
  })
}

/**
 * Remove documents from the database
 *
 * @param {Object} query - the MongoDB query that selects documents for deletion
 * @param {String} collection - the name of the collection to delete from
 */
DataStore.prototype.delete = function (query, collection) {
  return new Promise((resolve, reject) => {
    this.database.collection(collection).deleteMany(query, (err, result) => {
      return resolve({ deletedCount: result.deletedCount })
    })
  })
}

DataStore.prototype.getConnectionOptions = function(overrideOptions) {
  overrideOptions = overrideOptions || {}

  var connectionOptions = Object.assign({}, this.config)

  if ((this.config.enableCollectionDatabases || overrideOptions.auth) && overrideOptions.database && this.config[overrideOptions.database]) {
    connectionOptions = Object.assign(connectionOptions, { database: overrideOptions.database }, this.config[overrideOptions.database])
  }

  // required config fields
  if (!(connectionOptions.hosts && connectionOptions.hosts.length)) {
    throw new Error('`hosts` Array is required for Connection')
  }

  if (!connectionOptions.database) throw new Error('`database` String is required for Connection')

  return connectionOptions
}

DataStore.prototype.constructConnectionString = function(options) {
  // mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]
  // mongodb://myprimary.com:27017,mysecondary.com:27017/MyDatabase/?replicaset=MySet

  var connectionOptions = Object.assign({
    options: {}
  }, options)

  if (options.replicaSet) {
    connectionOptions.options.replicaSet = options.replicaSet
  }

  if (options.ssl) connectionOptions.options['ssl'] = options.ssl

  if (options.maxPoolSize) connectionOptions.options['maxPoolSize'] = options.maxPoolSize

  if (options.readPreference) connectionOptions.options['readPreference'] = options.readPreference

  var credentials = this.credentials(connectionOptions)
  var hosts = this.hosts(connectionOptions.hosts)
  var optionsString = this.encodeOptions(connectionOptions.options)

  return `mongodb://${credentials}${hosts}/${connectionOptions.database}${optionsString}`
}

/**
 * Returns a querystring encoded string containing the specified options
 */
DataStore.prototype.encodeOptions = function(options) {
  if (!options || Object.keys(options).length === 0) return ''
  return qs.encode(options)
}

DataStore.prototype.hosts = function(hosts) {
  return hosts.map((host) => { return host.host + ':' + (host.port || 27017) }).join(',')
}

/**
 * Returns database credentials as a string for inserting into the connection string
 */
DataStore.prototype.credentials = function(options) {
  if (!options.username || !options.password) {
    return ''
  } else {
    return options.username + ':' + options.password + '@'
  }
}

module.exports = DataStore