const models = require('../models');
const {Config, User} = require('../models');
let DefaultSettings = require('../config/DefaultSettings.json');
let DefaultUser = require('../config/DefaultUser.json');

/**
 * Sync Models To DB, Doesn't edit table if one with the same name found, set alter to true
 * to edit the structure of all tables to match the models.
 * */

const syncDefaults = async () => {
    await models.sequelize.sync({alter: false}).then(async function () {
        /**
         * Verify Settings.
         */
        try {
            DefaultSettings.forEach((setting) => {
                Config.findOne({where: {Setting: setting.Setting}})
                    .then((result) => {
                        if (!result) {
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
            console.log(e)
        }
        /**
         * Add Default User If None Exists.
         */

        User.count().then(count => {
            if (count === 0) {
                User.create(DefaultUser)
            }
        }).catch(e => {
            console.log(e);
        })

    });
}

await syncDefaults();

module.exports = {syncDefaults}
