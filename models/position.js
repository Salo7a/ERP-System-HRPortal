'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Position extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Position.hasMany(models.Invite, { onDelete: 'CASCADE', onUpdate: 'CASCADE', hooks: true })
      Position.hasMany(models.User)
      Position.belongsTo(models.Rank)
      Position.belongsTo(models.Team)
      Position.belongsTo(models.Directorate)
    }
  }
  Position.init({
    Name: DataTypes.STRING,
    Description: DataTypes.STRING,
    isVisible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Position',
  });
  return Position;
};