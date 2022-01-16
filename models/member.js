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
      Member.hasMany(models.Ranking)
      Member.belongsTo(models.Team)
    }
  }
  Member.init({
    Name: DataTypes.STRING,
    Email: {
      type: DataTypes.STRING,
      isEmail: true
    },
    Committee: DataTypes.STRING,
    Directorate: DataTypes.STRING,
    Phone: DataTypes.STRING,
    PageID: {
      type: DataTypes.INTEGER(8),
      unique: "PageID"
    },
    KPI: {
      type: DataTypes.JSON,
      get: function () {
        try {
          return JSON.parse(this.getDataValue('KPI'));
        } catch (e) {
          return this.getDataValue('KPI');
        }
      },
      defaultValue: {"January":null,"February":null,"March":null,"April":null,"May":null,"June":null,"July":null}
    },
    Seen:{
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    Photo: {
      type: DataTypes.STRING,
      defaultValue: "default.png"
    },
    Season: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Member',
  });
  return Member;
};