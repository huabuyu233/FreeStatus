import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: {
                window: 'readonly',
                document: 'readonly',
                SillyTavern: 'readonly',
                globalThis: 'readonly',
                prompt: 'readonly',
                URL: 'readonly',
                Blob: 'readonly',
                navigator: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                fetch: 'readonly',
                Date: 'readonly',
                JSON: 'readonly',
                Math: 'readonly',
                Number: 'readonly',
                Object: 'readonly',
                Array: 'readonly',
                String: 'readonly',
                Boolean: 'readonly',
                Set: 'readonly',
                Map: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
    },
];
