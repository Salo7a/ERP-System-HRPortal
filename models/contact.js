'use strict';
module.exports = (sequelize, DataTypes) => {
  const Contact = sequelize.define('Contact', {
    Name: DataTypes.STRING,
    Email: DataTypes.STRING,
    Subject: DataTypes.STRING,
    Message: DataTypes.TEXT
  }, {});
  Contact.associate = function(models) {
    // associations can be defined here
  };
  return Contact;
};