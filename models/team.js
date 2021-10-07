'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Team extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Team.belongsTo(models.Directorate)
      Team.hasMany(models.Position)
      // Team.belongsToMany(models.Rank, { through: models.Position })
    }
  }
  Team.init({
    Name: DataTypes.STRING,
    DisplayName: DataTypes.STRING,
    Description: DataTypes.STRING,
    isVisible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Team',
  });
  return Team;
};