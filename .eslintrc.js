module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: ['./tsconfig.json', './services/*/tsconfig.json'],
    },
    plugins: ['@typescript-eslint', 'import'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'prettier',
    ],
    settings: {
        'import/resolver': {
            typescript: {
                alwaysTryTypes: true,
                project: ['./tsconfig.json', './services/*/tsconfig.json'],
            },
        },
    },
    rules: {
        // TypeScript strict rules
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/require-await': 'error',
        '@typescript-eslint/strict-boolean-expressions': 'warn',

        // Import ordering
        'import/order': [
            'error',
            {
                groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                'newlines-between': 'always',
                alphabetize: { order: 'asc', caseInsensitive: true },
            },
        ],
        'import/no-unresolved': 'error',
        'import/no-cycle': 'error',
        'import/no-unused-modules': 'warn',

        // Security-related
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',

        // General quality
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
    },
    ignorePatterns: ['node_modules/', 'dist/', '*.js', '!.eslintrc.js'],
};
