export default {
  displayName: 'nx-openapi-client',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    },
  },
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'html', 'd.ts'],
  coverageDirectory: '../../coverage/libs/nx-openapi-client',
  preset: '../../jest.preset.js',
};
