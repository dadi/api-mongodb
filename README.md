# API MongoDB Adapter

[![npm version](https://badge.fury.io/js/%40dadi%2Fapi-mongodb.svg)](https://badge.fury.io/js/%40dadi%2Fapi-mongodb)
[![Coverage Status](https://coveralls.io/repos/github/dadi/api-mongodb/badge.svg?branch=master)](https://coveralls.io/github/dadi/api-mongodb?branch=master)
[![Build Status](https://travis-ci.org/dadi/api-mongodb.svg?branch=master)](https://travis-ci.org/dadi/api-mongodb)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)

## Requirements

* [DADI API](https://www.npmjs.com/package/@dadi/api) Version 3.0.0 or greater
* A running MongoDB server

## Usage

To use this adapter with your DADI API installation, you'll need to add it to your API's dependencies:

```bash
$ cd my-api
$ npm install @dadi/api-mongodb
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
  "enableCollectionDatabases": false,
  "databases": [
    {
      "id": "authdb",
      "hosts": "127.0.0.1:27017",
      "username": "johndoe",
      "password": "topsecret"
    },
    {
      "default": true,
      "id": "secondary",
      "hosts": "127.0.0.1:27018"
    }
  ]
}
```

#### Configuration Properties

##### `enableCollectionDatabases`

Determines whether the database portion of the URL should dictate the actual MongoDB database to be used. When enabled, the request `GET /1.0/mydatabase/mycollection` would look for documents in a database with the ID `mydatabase`. If disabled, the default database (i.e. containing the property `default: true` in the configuration file) will be used.

##### `databases`

The list of MongoDB databases to be used, as an array. Each database must be defined as an object with the following properties:

###### `authDatabase`

The database to authenticate against when supplying a username and password.

- _Format_: String
- _Default_: `''`
- _Environment variable_: `DB_{database}_AUTH_SOURCE`
- _Required_: No

###### `authMechanism`

If no authentication mechanism is specified or the mechanism DEFAULT is specified, the driver will attempt to authenticate using the SCRAM-SHA-1 authentication method if it is available on the MongoDB server. If the server does not support SCRAM-SHA-1 the driver will authenticate using MONGODB-CR.

- _Format_: String
- _Default_: `''`
- _Environment variable_: `DB_{database}_AUTH_MECHANISM`
- _Required_: No

###### `default`

Whether this database should be used as the default (main) database. When no database has the `default` flag, the first one in the array will be used as default.

- _Format_: Boolean
- _Default_: `false`
- _Environment variable_: `DB_{database}_DEFAULT`
- _Required_: No

###### `hosts`

Comma-separated string of MongoDB hosts, including port (e.g. localhost,localhost:27018,localhost:27019).

- _Format_: String
- _Environment variable_: `DB_{database}_HOSTS`
- _Required_: **Yes**


###### `id`

Database unique identifier.

- _Format_: String
- _Required_: **Yes**


###### `maxPoolSize`

The maximum number of connections in the connection pool.

- _Format_: Number
- _Default_: `0`
- _Environment variable_: `DB_{database}_MAX_POOL`
- _Required_: No


###### `password`

The access password, if one is needed.

- _Format_: String
- _Default_: `""`
- _Environment variable_: `DB_{database}_PASSWORD`
- _Required_: No


###### `readPreference`

How MongoDB routes read operations to the members of a replica set - see https://docs.mongodb.com/manual/reference/read-preference/.

- _Format_: `"primary"`, `"primaryPreferred"`, `"secondary"`, `"secondaryPreferred"` or `"nearest"`
- _Default_: `"secondaryPreferred"`
- _Required_: No


###### `replicaSet`

The name of the replica set to identify the hosts.

- _Format_: String
- _Required_: No


###### `ssl`

Whether to initiate the connection with TLS/SSL.

- _Format_: Boolean
- _Default_: `false`
- _Required_: No


###### `username`

The access username, if one is needed.

- _Format_: String
- _Default_: `""`
- _Environment variable_: `DB_{database}_USERNAME`
- _Required_: No

## Licence

DADI is a data centric development and delivery stack, built specifically in support of the principles of API first and COPE.

Copyright notice<br />
(C) 2019 DADI+ Limited <support@dadi.cloud><br />
All rights reserved

This product is part of DADI.<br />
DADI is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version ("the GPL").

**If you wish to use DADI outside the scope of the GPL, please
contact us at info@dadi.co for details of alternative licence
arrangements.**

**This product may be distributed alongside other components
available under different licences (which may not be GPL). See
those components themselves, or the documentation accompanying
them, to determine what licences are applicable.**

DADI is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

The GNU General Public License (GPL) is available at
http://www.gnu.org/licenses/gpl-3.0.en.html.<br />
A copy can be found in the file GPL.md distributed with
these files.

This copyright notice MUST APPEAR in all copies of the product!
