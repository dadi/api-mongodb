# API MongoDB Adapter

[![npm (scoped)](https://img.shields.io/npm/v/@dadi/api-mongodb.svg?maxAge=10800&style=flat-square)](https://www.npmjs.com/package/@dadi/api-mongodb)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)

### Configuration Files

Configuration settings are defined in JSON files within a `/config` directory at the root of your API application. DADI API has provision for multiple configuration files, one for each environment that your API is expected to run under: `development`, `qa` and `production`.

The naming convention for MongoDB configuration files follows the format `mongodb.<environment>.json`

For example:

```
mongodb.development.json
mongodb.qa.json
mongodb.production.json
```

### Application Anatomy

```sh
my-api/
  config/            # contains environment-specific
                     # configuration properties
    config.development.json
    config.qa.json
    config.production.json
    mongodb.development.json
    mongodb.qa.json
    mongodb.production.json

  main.js            # the entry point of the app

  package.json

  workspace/
    collections/     # collection schema files
    endpoints/       # custom Javascript endpoints

```

### Configuration

Specifies the MongoDB database(s) to connect to.

```json
{
  "database": {
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
}
```

**database.hosts**: must contain an array of hosts each with `host` and `port`.

 * Hosts may be specified using an IP address or hostname.
 * If only using a single MongoDB instance this array needs only one host.

Multiple hosts are required for a replica set or sharded setup and may look similar to the following example using [MongoLab](https://mongolab.com) databases:


```json
{
  "database": {
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
}
```

This configuration will produce the following MongoDB connection string:

```
mongodb://apiUser:apiPassword@ds012345-z1.mongolab.com:12345,ds012345-z2.mongolab.com:12345,ds012345-z3.mongolab.com:12345/myApi?replSet=rs0001
```

The Node.js MongoDB driver handles communication with the database servers to determine the primary instance.

#### Collection-specific Databases

The `enableCollectionDatabases` setting determines whether the API will store collection data in separate databases as defined by the collection URLs.

```
/1.0/library/books
```

The URL format contains three segments:

 * **API version**: `"1.0"`
 * **Database**: `"library"`
 * **Collection**: `"books"`

If `"enableCollectionDatabases": true` the API will store the `books` data in the `library` database, regardless of the `database` setting in the configuration file.

Otherwise, if `"enableCollectionDatabases": false` the API will store the `books` data (and all other collection data) in the database specified in the configuration file's `database` setting.

#### Configuration Properties

Property       | Description        |  Type        | Default         |  Example
:----------------|:------------|:------------------|:----------------|:---------
hosts | An array of database hosts to connect to | Array | `[ { host: "127.0.0.1", port: 27017 } ]` | `""`
database | The database in which to store collection data  | String | `""` | `"myApi"`
username | The username used to connect to the database  | String | `""` | `"apiUser"`
password | The password used to connect to the database | String | `""` | `"apiPassword"`
ssl |  | Boolean | `false` | `true`
replicaSet | If false, the API will not attempt to connect to a replica set. If a string value, the API will use this value in the connection string to connect to a replica set  | Boolean/String | `false` | `"s0001"`
enableCollectionDatabases | If true, the API allows splitting collection data into separate databases | Boolean | `false` | `true`
