#! /usr/bin/env node
import console from 'console'
import {exec} from 'child_process'
import process from 'process'

if (process.env['CI']) {
  exec(
    'cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js',
    (err) => {
      if (err) console.log(err)
    },
  )
}
