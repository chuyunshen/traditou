export default [
    {
      input: 'content/services/telequebec.js',
      output: {
        file: 'dist/telequebec_bundle.js',
        format: 'umd',
        strict: false
      }
    },
    {
      input: 'content/services/toutv.js',
      output: {
          file: 'dist/toutv_bundle.js',
          format: 'umd',
          strict: false
        }
    },
    {
      input: 'content/services/noovo.js',
      output: {
          file: 'dist/noovo_bundle.js',
          format: 'umd',
          strict: false
        }
    },
    {
      input: 'content/services/prime.js',
      output: {
          file: 'dist/prime_bundle.js',
          format: 'umd',
          strict: false
        }
    },
    {
      input: 'content/services/tv5.js',
      output: {
          file: 'dist/tv5_bundle.js',
          format: 'umd',
          strict: false
        }
    }
  ];