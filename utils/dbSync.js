const models = require('../models');
const {Config, User} = require('../models');
let DefaultSettings = require('../config/DefaultSettings.json');
let DefaultUser = require('../config/DefaultUser.json');

/**
 * Sync Models To DB, Doesn't edit table if one with the same name found, set alter to true
 * to edit the structure of all tables to match the models.
 * */

models.sequelize.sync({alter: false}).then(function () {
    /**
     * Verify Settings.
     */
    try {
        DefaultSettings.forEach((setting)=>{
            Config.findOne({where: {Setting: setting.Setting}})
                .then((result)=>{
                    if (!result){
                        Config.create(
                            {
                                "Setting": setting.Setting,
                                "Value": setting.Value,
                                "Description": setting.Description
                            }
                        )
                    }
                })
        })
    } catch (e) {
        console.error(e)
    }
    /**
     * Add Default User If None Exists.
     */
    try {
        User.count().then(count =>{
            if (count === 0){
                User.create(DefaultUser)
            }
        })
    } catch (e) {
        console.error(e)
    }
});