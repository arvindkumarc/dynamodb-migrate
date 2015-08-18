var should = require('chai').should(),
    dynmigrate = require('../index');

require('dotenv').load();

describe('#migrate', function() {
  it('should run migrations for all file in location ./dynamo-migrations', function() {
    dynmigrate.migrate();
  });
});
