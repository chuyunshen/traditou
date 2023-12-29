export default [
    {
      input: 'content/telequebec_content.js',
      output: {
        file: 'dist/telequebec_bundle.js',
        format: 'umd',
        strict: false
      }
    },
    {
      input: 'content/toutv_content.js',
      output: {
          file: 'dist/toutv_bundle.js',
          format: 'umd',
          strict: false
        }
    },
    {
      input: 'content/noovo_content.js',
      output: {
          file: 'dist/noovo_bundle.js',
          format: 'umd',
          strict: false
        }
    },
    {
      input: 'content/prime_content.js',
      output: {
          file: 'dist/prime_bundle.js',
          format: 'umd',
          strict: false
        }
    }
  ];