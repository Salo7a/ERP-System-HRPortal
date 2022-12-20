const {Config} = require('../models');

module.exports = {
    syncSettings:  ()=>{
        Config.findAll({raw: true}).then(async r => {
                let settings = {};
                await r.forEach(setting => {
                    settings[setting.Setting] = setting;
                });
                global.settings = settings
            }
        )
    }
}