# dynamodb-migrate
Migration framework for dynamodb

## Setup
Assign AWS_DYNAMODB_ENDPOINT with DynamoDB url. For local, set `http://localhost:8000`

## Test
* start running local dynamo-db
* npm test

## Usage

* Create `dynamo-migrations` folder in project root.
* place the migrations prefixed by numbers, or any other identifier for it to be lined up properly, you can use timestamps like in a rails project.

```
var dynmigrate = require('dynamodb-migrate');
dynmigrate.migrate();
```
