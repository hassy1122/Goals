'use strict';

const fs = require('fs');
const path = require('path');
const YAML = require('js-yaml');
const swaggerUi = require('swagger-ui-express');

const spec = YAML.load(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'openapi.yaml'), 'utf8'));

module.exports = {
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(spec, { docExpansion: 'none' }),
  spec,
};
