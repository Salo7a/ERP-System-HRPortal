'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Rank extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // Rank.belongsToMany(models.Team, { through: models.Position })
      // Rank.belongsToMany(models.Directorate, { through: models.Position })
      Rank.hasMany(models.Position)
    }
  }
  Rank.init({
    Name: DataTypes.STRING,
    Level: DataTypes.INTEGER,
    isInternal: DataTypes.BOOLEAN,
    isDirectorateOnly: DataTypes.BOOLEAN,
    isTeamOnly: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Rank',
    tableName: 'Rank'
  });
  return Rank;
};