const {Config} = require('../models');
const {syncDefaults} = require('./dbSync');

module.exports = {
    syncSettings:  ()=>{
        Config.findAll({raw: true}).then(async r => {
                if (!r) {
                    await syncDefaults()
                }
                let settings = {};
                await r.forEach(setting => {
                    settings[setting.Setting] = setting;
                });
                global.settings = settings
            }
        )
    }
}