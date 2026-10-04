import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
    ...tseslint.configs.recommended,
    prettierRecommended,
    {
        files: ['**/*.ts'],
        rules: {
            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            'no-console': 'warn',
        },
    },
];
