'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Directorate extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Directorate.hasMany(models.Team)
      Directorate.hasMany(models.Position)
      // Directorate.belongsToMany(models.Rank, { through: models.Position })
    }
  }
  Directorate.init({
    Name: DataTypes.STRING,
    DisplayName: DataTypes.STRING,
    Image: DataTypes.STRING,
    Description: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Directorate',
  });
  return Directorate;
};