module.exports = {
  "development": {
    "username": "root",
    "password": "mysql",
    "database": "portaldev",
    "host": "127.0.0.1",
    "dialect": "mysql",
    "dialectOptions": {
      "timezone": "local"
    },
    "timezone": "Africa/Cairo"
  },
  "test": {
    "username": "root",
    "password": null,
    "database": "database_test",
    "host": "127.0.0.1",
    "dialect": "mysql"
  },
  "production": {
    "username": process.env.PROD_DB_USERNAME || "root",
    "password": process.env.PROD_DB_PASSWORD || "mysql",
    "database": process.env.PROD_DB_NAME || "portalprod",
    "host": process.env.PROD_DB_HOST || "127.0.0.1",
    "dialect": process.env.PROD_DB_DIALECT || "mysql",
    "dialectOptions": {
      "timezone": "local"
    },
    "timezone": process.env.PROD_DB_TMZ || "Africa/Cairo",
    "pool": {
      "max": 5,
      "min": 0,
      "acquire": 60000,
      "idle": 10000
    }
  }
}

