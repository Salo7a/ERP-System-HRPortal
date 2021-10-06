'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Ranking extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Ranking.belongsTo(models.Member)
    }
  }
  Ranking.init({
    Month: DataTypes.STRING,
    Ranking: DataTypes.INTEGER,
    Directorate: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Ranking',
  });
  return Ranking;
};