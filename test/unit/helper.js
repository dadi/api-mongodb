import {fileURLToPath} from 'url'
import fs from 'fs'
import {loadConfig} from '../../config.js'
import path from 'path'
import {setTimeout} from 'timers'

export function getModelSchema() {
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

export function getExtendedModelSchema() {
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
export function getWordSchema() {
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
export function getSearchSchema() {
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
export function setConfig(data) {
  const payload = JSON.stringify(data, null, 2)
  const filePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../config/mongodb.test.json',
  )
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
