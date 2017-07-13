# API MongoDB Adapter

[![npm (scoped)](https://img.shields.io/npm/v/@dadi/api-mongodb.svg?maxAge=10800&style=flat-square)](https://www.npmjs.com/package/@dadi/api-mongodb)
[![coverage](https://img.shields.io/badge/coverage-67%25-yellow.svg?style=flat?style=flat-square)](https://github.com/dadi/api-mongodb)
[![Build Status](https://travis-ci.org/dadi/api-mongodb.svg?branch=master)](https://travis-ci.org/dadi/api-mongodb)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)

## Requirements

* [DADI API](https://www.npmjs.com/package/@dadi/api) Version 3.0.0 or greater
* a running MongoDB server

## Usage

To use this adapter with your DADI API installation, you'll need to add it to your API's dependencies:

```bash
$ cd my-api
$ npm install --save @dadi/api-mongodb
```

## Tests

To run the test suite you'll need a MongoDB server running on localhost with the default port of 27017. If you've changed the default port, modify the test configuration file at `config/mongodb.test.json`. This file is created from `config/mongodb.test.json.sample` the first time the test suite is run.

Run the tests:

```bash
$ git clone https://github.com/dadi/api-mongodb.git
$ cd api-mongodb
$ npm test
```

## Configuration

### Configuration Files

Configuration settings are defined in JSON files within a `/config` directory at the root of your API application. DADI API uses a configuration file for the MongoDB connector that matches the environment you are running under.

The naming convention for MongoDB configuration files follows the format `mongodb.<environment>.json`

#### Example

Assuming that the entry point for your application is `main.js` and launching it with the following command, DADI API will attempt to load a MongoDB configuration file named `mongodb.production.js`.

```sh
$ NODE_ENV=production node main.js
```
### Application Anatomy

```sh
my-api/
  config/                     # contains environment-specific configuration properties
    config.development.json   # main API configuration file, development environment
    config.production.json
    mongodb.development.json  # MongoDB configuration file, development environment
    mongodb.production.json

  main.js                     # the entry point of the app

  package.json

  workspace/
    collections/              # collection schema files
    endpoints/                # custom Javascript endpoints

```

### Configuration

Specifies the MongoDB database(s) to connect to.

```json
{
  "hosts": [
    {
      "host": "127.0.0.1",
      "port": 27017
    }
  ],
  "database": "myApi",
  "username": "apiUser",
  "password": "apiPassword",
  "ssl": false,
  "replicaSet": false,
  "enableCollectionDatabases": false
}
```

#### Configuration Properties

##### hosts

An array of database hosts to connect to; each array entry must contain `host` and `port`. Hosts may be specified using an IP address or hostname.

```json
"hosts": [
  {
    "host": "127.0.0.1",
    "port": 27017
  }
]
```

> If only using a single MongoDB instance this array needs only one host.

##### database `String`

The name of the database in which to store collection data.

##### username `String`
The username used to connect to the specified database.

##### password `String`

The password used to connect to the specified database.

##### ssl `Boolean`

 * Default: `false`

##### replicaSet `Boolean`

If `false`, the API will not attempt to connect to a replica set. If a string value, the API will use this value in the connection string to connect to a replica set.

 * Default: `false`
 * Example: `"s0001"`

##### enableCollectionDatabases `Boolean`

The `enableCollectionDatabases` setting determines whether the API will store collection data in separate databases as defined by the collection URLs.

The collection URL format contains three segments:

```
e.g. http://api.somedomain.tech/1.0/library/books
```

 * **API version**: `"1.0"`
 * **Database**: `"library"`
 * **Collection**: `"books"`

If `"enableCollectionDatabases": true` the API will store the `books` data in the `library` database, regardless of the `database` setting in the configuration file.

Otherwise, if `"enableCollectionDatabases": false` the API will store the `books` data (and all other collection data) in the database specified in the configuration file's `database` setting.

#### Environment variables for database configuration properties

Property | Environment variable | Description
:--|:---|:--
Database name | `DB_NAME` | The name of the database that holds general collection data
Database username | `DB_USERNAME` | The username for connecting to the database that holds general collection data
Database password | `DB_PASSWORD` | The password for connecting to the database that holds general collection data
Authentication database name | `DB_AUTH_NAME` | The name of the database that holds authentication data, such as client account keys and access tokens
Authentication database username | `DB_AUTH_USERNAME` | The username for connecting to the database that holds authentication data
Authentication database password | `DB_AUTH_PASSWORD` | The password for connecting to the database that holds authentication data

### Connecting to a replica set or sharded database

Multiple `host` entries are required for a replica set or sharded setup and may look similar to the following example using [MongoLab](https://mongolab.com) databases:


```json
{
  "hosts": [
      {
        "host": "ds012345-z1.mongolab.com",
        "port": 12345
      },
      {
        "host": "ds012345-z2.mongolab.com",
        "port": 12345
      },
      {
        "host": "ds012345-z3.mongolab.com",
        "port": 12345
      }
    ],
  "database": "myApi",
  "username": "apiUser",
  "password": "apiPassword",
  "ssl": false,
  "replicaSet": "rs0001"
}
```

This configuration will produce the following MongoDB connection string:

```
mongodb://apiUser:apiPassword@ds012345-z1.mongolab.com:12345,ds012345-z2.mongolab.com:12345,ds012345-z3.mongolab.com:12345/myApi?replSet=rs0001
```

The Node.js MongoDB driver handles communication with the database servers to determine the primary instance.
