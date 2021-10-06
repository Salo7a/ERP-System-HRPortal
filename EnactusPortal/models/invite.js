'use strict';
module.exports = (sequelize, DataTypes) => {
  const Invite = sequelize.define('Invite', {
    Code: DataTypes.STRING,
    Season: DataTypes.STRING,
    isUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {});
  Invite.associate = function(models) {
    // associations can be defined here
    Invite.belongsTo(models.Position)
  };
  return Invite;
};