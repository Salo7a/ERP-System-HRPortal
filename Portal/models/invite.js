'use strict';
module.exports = (sequelize, DataTypes) => {
  const Invite = sequelize.define('Invite', {
    Code: DataTypes.STRING,
    Position: DataTypes.STRING,
    Committee: DataTypes.STRING,
    Used: {
      type: DataTypes.BOOLEAN,
      default: false
    },
    Rep: DataTypes.STRING
  }, {});
  Invite.associate = function(models) {
    // associations can be defined here
  };
  return Invite;
};