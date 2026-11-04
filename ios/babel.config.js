// `#lib` is web/src/lib, shared by path (ARCHITECTURE §8.5). The worklets plugin stays last: it rewrites function
// bodies after every other transform.
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module-resolver', { extensions: ['.ts', '.tsx', '.js', '.json'], alias: { '#lib': '../web/src/lib' } }],
    'react-native-worklets/plugin',
  ],
};
