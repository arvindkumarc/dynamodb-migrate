var AWS = require('aws-sdk'),
  fs = require('fs');

module.exports = {
  migrate: function() {
    var migrationLocation = process.env.PWD + "/dynamo-migrations";
    fs.readdir(migrationLocation, function(err, files) {
      if (err) {
        console.error("Unable to get content from dynamo-migrations folder. Reason: ", err);
      }

      var dynamodb = new AWS.DynamoDB({ endpoint: new AWS.Endpoint(process.env.AWS_DYNAMODB_ENDPOINT) });
      files.forEach(function(filename) {
        var fileLocation =  "./dynamo-migrations/" + filename;
        var migration = require(fileLocation);
        if (typeof migration.migrate === 'function') {
          migration.migrate(dynamodb);
        }
      });
    });
  }
}
