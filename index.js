var AWS = require('aws-sdk'),
  fs = require('fs');

module.exports = {
  migrate: function(callback) {
    var migrationLocation = process.env.PWD + "/dynamo-migrations";
    fs.readdir(migrationLocation, function(err, files) {
      if (err) {
        console.error("Unable to get content from dynamo-migrations folder. Reason: ", err);
      }

      var dynamodb = new AWS.DynamoDB({ endpoint: new AWS.Endpoint(process.env.AWS_DYNAMODB_ENDPOINT) });
      checkAndCreateMigrationTable(dynamodb, function(err) {
        if (err) {
          throw err;
        }

        files.forEach(function(filename) {
          var fileLocation =  "./dynamo-migrations/" + filename;
          var migration = require(fileLocation);
          if (typeof migration.migrate === 'function') {
            migration.migrate(dynamodb);
          } else {
            console.error("'migrate' function not found.");
            throw new Error("'migrate' function not found in: ", fileLocation);
          }
        });

        if (typeof callback === 'function') {
          callback();
        }
      });
    });
  }
}

var checkAndCreateMigrationTable = function(dynamodb, callback) {
  dynamodb.describeTable({TableName: 'dynamo_migrations'}, function(err, data) {
    if (err != null && err.code == 'ResourceNotFoundException') {
      var migTable = {
        AttributeDefinitions: [
            { AttributeName: 'id', AttributeType: 'N' },
            { AttributeName: 'name', AttributeType: 'S' }
          ],
          GlobalSecondaryIndexes: [
            {IndexName: 'name_index',
             KeySchema: [{AttributeName: 'name', KeyType: 'HASH'}],
             Projection: {ProjectionType: 'ALL'},
             ProvisionedThroughput: {ReadCapacityUnits: 1, WriteCapacityUnits: 1}}
          ],
          KeySchema: [
            { AttributeName: 'id', KeyType: 'HASH' }
          ],
          ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
          // FIXME: 'dynamo_migrations' tablename should be customizable.
          TableName: 'dynamo_migrations'
      };

      dynamodb.createTable(migTable, function(error, data) {
        if (error) {
            console.log("Migration table creation error: ", error, error.stack);
            throw new Error("failed to create migrations table");
          } else {
            console.log("Migrations Table Created!");
          }

          callback(error);
      });
    }

    callback(null);
  });
}
