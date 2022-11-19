'use strict';
const {
  Model
} = require('sequelize');
const bcrypt = require('bcryptjs');
const models = require('../models');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.belongsTo(models.Position)
    }
  }
  User.init({
    Username: DataTypes.STRING,
    Name: DataTypes.STRING,
    Email: {
      type: DataTypes.STRING,
      isEmail: true
    },
    PositionText: DataTypes.STRING,
    Committee: DataTypes.STRING,
    Phone: DataTypes.STRING,
    Birthday: DataTypes.DATEONLY,
    Password: DataTypes.STRING,
    Photo: {
      type: DataTypes.STRING,
      defaultValue: "default.png"
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    ActiveHash: DataTypes.STRING,
    RememberHash: DataTypes.STRING,
    Season: DataTypes.STRING,
    Rep:{
      type: DataTypes.STRING,
      defaultValue: '[]',
      get: function () {
        try {
          if (this.getDataValue('Rep') !== null) {
            return this.getDataValue('Rep').split(',');
          } else {
            return []
          }
        } catch {
          winston.error(`Couldn't get rep teams`)
        }

      }
    },
    LastLogin: {
      type: DataTypes.DATE
    },
    LastActive: {
      type: DataTypes.DATE
    },
  }, {
    sequelize,
    modelName: 'User',
    classMethods: {
      comparePassword: async function (Password, hash) {
        await bcrypt.compare(Password, hash, function (err, isMatch) {
          return isMatch;
        });
      }
    },
  });

  User.beforeCreate(async (User, options) => {
    return bcrypt.genSalt(10).then(async salt => {
      await bcrypt.hash(User.Password, salt).then(async hash => {
            User.Password = hash;
          }
      ).catch(err => {
        throw new Error();
      })
    }).catch(err => {
      throw new Error();
    })

  });
  User.beforeUpdate((User, options) => {
    // if(User.Password.length > 6)
    // {
    //     return bcrypt.genSalt(10).then(async salt => {
    //         await bcrypt.hash(User.Password, salt).then(async hash => {
    //                 User.Password = hash;
    //             }
    //         ).catch(err => {
    //             throw new Error();
    //         })
    //     }).catch(err => {
    //         throw new Error();
    //     })
    // }


  });

  User.prototype.comparePass = function (password) {
    console.log("From Model: " + password);
    return bcrypt.compareSync(password, this.Password);
  };

  return User;
};