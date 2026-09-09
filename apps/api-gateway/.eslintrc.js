module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@prisma/client',
            message: 'Constitutional Violation: Do not import Prisma directly in the API Gateway. Route all database interactions through @saas/core-platform.',
          },
        ],
      },
    ],
  },
};
