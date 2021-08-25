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
      Rank.belongsTo(models.Member)
    }
  }
  Rank.init({
    Month: DataTypes.STRING,
    Rank: DataTypes.INTEGER,
    Directorate: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Rank',
  });
  return Rank;
};