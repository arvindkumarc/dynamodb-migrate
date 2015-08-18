var AWS = require('aws-sdk'),
  fs = require('fs');

module.exports = {
  migrate: function() {
    var dynamodb = new AWS.DynamoDB({ endpoint: new AWS.Endpoint(process.env.AWS_DYNAMODB_ENDPOINT) });
    var migrationLocation = process.env.PWD + "/dynamo-migrations";
    console.log(migrationLocation);
    fs.readdir(migrationLocation, function(err, files) {
      console.log(err, files);
    });
  }
}
