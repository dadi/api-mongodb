#! /usr/bin/env node
const console = require('console')
const {exec} = require('child_process')
const process = require('process')

if (process.env['CI']) {
  exec(
    'cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js',
    (err) => {
      if (err) console.log(err)
    },
  )
}
