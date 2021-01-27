'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Member extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Member.init({
    Name: DataTypes.STRING,
    Email: {
      type: DataTypes.STRING,
      isEmail: true
    },
    Committee: DataTypes.STRING,
    Phone: DataTypes.STRING,
    PageID: {
      type: DataTypes.INTEGER(8),
      unique: true
    },
    KPI: {
      type: DataTypes.JSON,
      get: function () {
        return JSON.parse(this.getDataValue('KPI'));
      }
    },
  }, {
    sequelize,
    modelName: 'Member',
  });
  return Member;
};