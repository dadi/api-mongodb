import eslintConfig from '@dadi/eslint-config'
import js from '@eslint/js'
import mochaPlugin from 'eslint-plugin-mocha'

export default [
  js.configs.recommended,
  {rules: eslintConfig.rules},
  {
    ...mochaPlugin.configs.flat.recommended,
    files: ['test/**/*.js'],
  },
]
