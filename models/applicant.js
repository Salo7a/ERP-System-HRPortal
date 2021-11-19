'use strict';
const {
  Model
} = require('sequelize');
const { formatToTimeZone }= require("date-fns-timezone");
function format(time) {
  // Hours, minutes and seconds
  let hrs = ~~(time / 3600);
  let mins = ~~((time % 3600) / 60);
  let secs = ~~time % 60;

  // Output like "1:01" or "4:03:59" or "123:03:59"
  let ret = "";
  if (hrs > 0) {
    ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
  }
  ret += "" + mins + ":" + (secs < 10 ? "0" : "");
  ret += "" + secs;
  return ret;
}
module.exports = (sequelize, DataTypes) => {
  class Applicant extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Applicant.init({
    // faculty, academic, major, minor, english, courses, first, second
    Name: {
      type: DataTypes.STRING
    },
    Age: DataTypes.INTEGER,
    Phone: DataTypes.STRING,
    Email: {
      type: DataTypes.STRING,
      email: true
    },
    State: {
      type: DataTypes.STRING,
      default: "Applied"
    },
    CUStudent: DataTypes.STRING,
    Faculty: DataTypes.STRING,
    Time: {
      type: DataTypes.INTEGER,
      get: function() {
        return format(this.getDataValue('Time'));
      }
    },
    Academic: DataTypes.STRING,
    Major: DataTypes.STRING,
    Minor: DataTypes.STRING,
    English: DataTypes.STRING,
    Courses: DataTypes.TEXT,
    Excur: DataTypes.TEXT,
    First: DataTypes.STRING,
    Second: DataTypes.STRING,
    Answers: {
      type: DataTypes.JSON
      // get: function () {
      //   return JSON.parse(this.getDataValue('Answers'));
      // }
    },
    Token: DataTypes.STRING,
    Start: {
      type: DataTypes.DATE
    },
    End: {
      type: DataTypes.DATE
    },
    IDate: DataTypes.DATEONLY,
    ITime: DataTypes.TIME,
    ATime: DataTypes.TIME,
    Notes: DataTypes.TEXT,
    Season: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Applicant',
    tableName: 'Applicants'
  });
  return Applicant;
};