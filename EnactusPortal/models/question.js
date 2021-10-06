'use strict';
const {
  Model
} = require('sequelize');
const {Question} = require("../models");
module.exports = (sequelize, DataTypes) => {
  class Question extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Question.init({
    Text: DataTypes.STRING,
    Type: DataTypes.STRING,
    Choice: DataTypes.STRING,
    isGeneral: DataTypes.BOOLEAN,
    isVisible: DataTypes.BOOLEAN,
    Season: DataTypes.STRING,
    Form: DataTypes.STRING,
    Extra: DataTypes.JSON
  }, {
    sequelize,
    modelName: 'Question',
    tableName: 'Question'
  });
  Question.GetGroupedQuestions =  (Form, Season)=>{
    return Question.findAll({where:{Form: Form, Season: Season}, raw: true}).then((questionsRaw)=>{
      let questions = {}
      for (let  key in questionsRaw) {
        let Choice = questionsRaw[key].Choice;
        if (!questions[Choice]) {
          questions[Choice] = [];
        }
        questions[Choice].push(questionsRaw[key]);
      }
      return questions
    })
  }
  return Question;
};