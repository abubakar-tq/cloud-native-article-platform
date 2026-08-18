module.exports = {
    'env': {
        'browser': true,
        'commonjs': true,
        'es2021': true,
        'node': true,
        'mocha': true
    },
    'extends': [
        'eslint:recommended'
    ],
    'parserOptions': {
        'ecmaVersion': 12
    },
    'rules': {
        'indent': ['error', 4],
        'linebreak-style': 'off',
        'quotes': ['error', 'single'],
        'semi': ['error', 'never'],
        'no-unused-vars': 'warn',
        'object-curly-spacing': ['error', 'always'],
        'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
        'keyword-spacing': ['error', { 'before': true, 'after': true }],
        'space-before-function-paren': ['error', 'never'],
        'comma-dangle': ['error', 'never'],
        'no-trailing-spaces': 'error',
        'eol-last': ['error', 'always'],
        'padded-blocks': ['error', 'never'],
        'comma-spacing': ['error', { 'before': false, 'after': true }],
        'array-callback-return': 'error',
        'no-return-assign': 'error',
        'object-shorthand': 'warn',
        'no-path-concat': 'error'
    },
    'globals': {
        'describe': 'readonly',
        'it': 'readonly',
        'before': 'readonly',
        'after': 'readonly',
        'beforeEach': 'readonly',
        'afterEach': 'readonly'
    }
}
