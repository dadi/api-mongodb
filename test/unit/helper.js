const {fileURLToPath} = require('url')
const fs = require('fs')
const {loadConfig} = require('../../config.js')
const path = require('path')
const {setTimeout} = require('timers')

function getModelSchema() {
  return {
    fieldName: {
      type: 'String',
      label: 'Title',
      comments: 'The title of the entry',
      placement: 'Main content',
      validation: {},
      required: false,
      message: '',
      display: {
        index: true,
        edit: true,
      },
    },
  }
}

function getExtendedModelSchema() {
  return {
    field1: {
      type: 'String',
      label: 'field1',
      comments: '',
      validation: {},
      required: false,
      message: '',
    },
    field2: {
      type: 'Number',
      label: 'field2',
      comments: '',
      validation: {},
      required: false,
      message: '',
    },
  }
}

/**
 * Return the template for the "words" collection schema, used to create the database collection
 * @return {Object} - the collection schema for the "words" collection
 */
function getWordSchema() {
  return {
    fields: {
      word: {
        type: 'String',
        required: true,
      },
    },
    settings: {
      cache: true,
      index: [
        {
          keys: {word: 1},
          options: {unique: true},
        },
      ],
    },
  }
}

/**
 * Return the template for the current collection's "search" collection schema, used to create the database collection
 * @return {Object} - the collection schema for the "search" collection
 */
function getSearchSchema() {
  return {
    fields: {
      word: {
        type: 'String',
        required: true,
      },
      document: {
        type: 'String',
        required: true,
      },
      weight: {
        type: 'Number',
        required: true,
      },
    },
    settings: {
      cache: true,
      index: [
        {
          keys: {word: 1},
        },
        {
          keys: {document: 1},
        },
        {
          keys: {weight: 1},
        },
      ],
    },
  }
}

/**
 * Set database config.
 * Returns a 'restore' function to put back whatever was there before.
 *
 * @param {Object} data
 * @returns {Promise<() => Promise<void>>}
 */
function setConfig(data) {
  const payload = JSON.stringify(data, null, 2)
  const filePath = path.resolve(__dirname, '../../config/mongodb.test.json')
  const currentContent = fs.readFileSync(filePath, 'utf8')

  fs.writeFileSync(filePath, payload)

  const restoreFn = () =>
    new Promise((resolve) => {
      fs.writeFileSync(filePath, currentContent)

      setTimeout(() => {
        loadConfig()

        resolve()
      }, 200)
    })

  return new Promise((resolve) => {
    setTimeout(() => {
      loadConfig()

      resolve(restoreFn)
    }, 500)
  })
}

module.exports.getModelSchema = getModelSchema
module.exports.getExtendedModelSchema = getExtendedModelSchema
module.exports.getWordSchema = getWordSchema
module.exports.getSearchSchema = getSearchSchema
module.exports.setConfig = setConfig
