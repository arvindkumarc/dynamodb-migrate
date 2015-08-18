var expect = require('chai').expect,
    dynmigrate = require('../index');

require('dotenv').load();

describe('#migrate', function() {
  it('should run migrations for all file in location ./dynamo-migrations', function(done) {
    dynmigrate.migrate();
    done();
  });

  it('should create migrations table if not created', function(done) {
    dynmigrate.migrate(function() {
      var AWS = require('aws-sdk');
      var dynamodb = new AWS.DynamoDB({ endpoint: new AWS.Endpoint(process.env.AWS_DYNAMODB_ENDPOINT) });
      dynamodb.describeTable({TableName: 'dynamo_migrations'}, function(err, data) {
        expect(err).to.be.null;
        done();
      });
    });
  });

  xit('should run new migrations', function(done) {

  });
});
