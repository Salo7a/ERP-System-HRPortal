let express = require('express');
const createError = require("http-errors");
let router = express.Router();
const {NotAuth, isAuth, isAdmin, imageFilter} = require('../utils/filters');
const {Applicant, Contact, Member, Ranking, Question, Position, Rank, Directorate, Team} = require("../models");
const chance = require('chance').Chance();
const {Op} = require("sequelize");
const sequelize = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require("fs");
const stream = require("stream");


let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/profiles/')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
});

function isNumeric(str) {
    if (typeof str != "string") return false // we only process strings!
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
        !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

// Portal Home (For Non-Members)
router.get('/', isAuth, async function (req, res, next) {
    if (req.user.Position.Name === 'TD Member') {
        res.redirect("/portal/members/kpi");
    } else {
        let applied = await Applicant.count({where: {State: {[Op.ne]: null}, Season: settings["CurrentSeason"].Value}});
        let accepted = await Applicant.count({where: {State: "Accepted", Season: settings["CurrentSeason"].Value}})
        let interviewed = await Applicant.count({
            where: {
                State: "Interviewed",
                Season: settings["CurrentSeason"].Value
            }
        })
        let rejected = await Applicant.count({where: {State: "Rejected", Season: settings["CurrentSeason"].Value}})
        let First = await Applicant.findAll({
            where: {State: {[Op.ne]: null}, First: {[Op.ne]: null}, Season: settings["CurrentSeason"].Value},
            attributes: ['Applicant.First', [sequelize.fn('count', sequelize.col('First')), 'count']],
            group: ['First'],
            raw: true
        });
        let Second = await Applicant.findAll({
            where: {State: {[Op.ne]: null}, Second: {[Op.ne]: null}, Season: settings["CurrentSeason"].Value},
            attributes: ['Applicant.Second', [sequelize.fn('count', sequelize.col('Second')), 'count']],
            group: ['Second'],
            raw: true
        });
        // let Dates = await Applicant.findAll({
        //     where: {State:{ [Op.ne]: null}},
        //     attributes: ['End', [sequelize.fn('count', sequelize.col('End')), 'count']],
        //     group: ['End'],
        //     raw: true,
        // })
        let Dates = await Applicant.findAll({
            where: {State: {[Op.ne]: null}, Season: settings["CurrentSeason"].Value},
            attributes: [
                [sequelize.literal(`DATE(End)`), 'End'],
                [sequelize.literal(`COUNT(*)`), 'count']
            ],
            group: [sequelize.literal(`DATE(End)`)],
            raw: true
        });
        res.render('portal/home', {
            title: "Portal",
            applied: applied,
            accepted: accepted,
            interviewed: interviewed,
            rejected: rejected,
            first: First,
            second: Second,
            dates: Dates
        });
    }

});

// Messages submitted on the contact us form
router.get('/messages', isAuth, async function (req, res, next) {

    Contact.findAll().then((contacts) => {
        res.render('portal/viewMessages', {title: "Messages", msgs: contacts});
    }).catch(() => {
        createError(404);
    });
});

// KPI Routes

// Main KPI Route, Lists All Members
router.get('/members/kpi', isAuth, async function (req, res, next) {
    if (!(["Admin", "President", "HR VP", "TD Team Leader", "TD Member"].includes(req.user.Position.Name) || req.user.isAdmin)) {
        res.redirect("/portal")
    }

    let mem;
    if (req.user.Position.Name === "TD Member") {
        mem = await Member.findAll({
            where:
                {
                    Committee: req.user.Rep,
                    Season: settings["CurrentSeason"].Value,
                }
        })
    } else {
        mem = await Member.findAll({
            where:
                {
                    Season: settings["CurrentSeason"].Value
                }
        })
    }
    let choices = await Team.findAll({order: [['DisplayName', 'ASC']]})

    res.render('portal/memberskpi', {title: "KPI", members: mem, choices});


});


router.post('/editkpi', isAuth, async function (req, res, next) {
    if (!(["Admin", "President", "HR VP", "TD Team Leader", "TD Member"].includes(req.user.Position.Name) || req.user.isAdmin)) {
        res.redirect("/portal")
    }
    let {January, February, March, April, May, June, July} = req.body
    Member.findOne({
        where: {
            id: req.body.id,
            Season: settings["CurrentSeason"].Value
        }
    }).then(mem => {
        mem.KPI = {
            "January": isNumeric(January) ? +January : null,
            "February": isNumeric(February) ? +February : null,
            "March": isNumeric(March) ? +March : null,
            "April": isNumeric(April) ? +April : null,
            "May": isNumeric(May) ? +May : null,
            "June": isNumeric(June) ? +June : null,
            "July": isNumeric(July) ? +July : null
        }
        mem.save();
            res.send({msg: "Saved!"});
        }
    ).catch(() => {
        createError(404);
    })
});

router.get('/members/edit/kpi', isAuth, function (req, res, next) {
    if (!(["Admin", "President", "HR VP", "TD Team Leader", "TD Member"].includes(req.user.Position.Name) || req.user.isAdmin)) {
        res.redirect("/portal")
    }
    let id = req.query.id;
    console.log(id);
    Member.findOne({
        where: {
            id: id,
            Season: settings["CurrentSeason"].Value
        }
    }).then(mem => {
        if (mem) {
            res.render('portal/editkpimodal', {mem: mem});
        }
    }).catch(() => {
        createError(404);
    })
});
//End KPI
// Ranking Routes
router.get('/members/ranking', isAuth, async function (req, res, next) {
    if (!(["Admin", "President", "HR VP", "TD Team Leader", "TD Member"].includes(req.user.Position.Name) || req.user.isAdmin)) {
        res.redirect("/portal")
    }
    let mem;
    if (req.user.Position.Name === "TD Member") {
        mem = await Member.findAll({
            where:
                {
                    Committee: req.user.Rep,
                    Season: settings["CurrentSeason"].Value
                }
        })
    } else {
        mem = await Member.findAll({where: {Season: settings["CurrentSeason"].Value}})
    }

    res.render('portal/membersrank', {title: "Set Ranking", members: mem});


});

router.post('/editranking', isAuth, async function (req, res, next) {
    if (!(["Admin", "President", "HR VP", "TD Team Leader", "TD Member"].includes(req.user.Position.Name) || req.user.isAdmin)) {
        res.redirect("/portal")
    }

    let {April, May, June, July} = req.body
    let Months = [isNumeric(April) ? "April" : null, isNumeric(May) ? "May" : null, isNumeric(June) ? "June" : null, isNumeric(July) ? "July" : null]
    Months = Months.filter(function (el) {
        return el != null;
    });
    let RankingValues = {
        "April": isNumeric(April) ? +April : null,
        "May": isNumeric(May) ? +May : null,
        "June": isNumeric(June) ? +June : null,
        "July": isNumeric(July) ? +July : null
    }
    Ranking.findAll({
        where: {
            MemberId: req.body.id
        }
    }).then(rankings => {
        rankings.forEach(ranking => {
            if (Months.includes(ranking.Month)) {
                ranking.Ranking = RankingValues[ranking.Month]
                ranking.save()
                Months = Months.filter(function (el) {
                    return el !== ranking.Month;
                });
            } else {
                ranking.destroy()
            }
        })
        Months.forEach(month => {
            Ranking.create({
                MemberId: req.body.id,
                Month: month,
                Ranking: RankingValues[month],
                Directorate: req.body.directorate
            })
        })
        res.send({msg: "Saved!"});
        }
    ).catch(() => {
        createError(404);
    })
});

router.get('/members/edit/ranking', isAuth, function (req, res, next) {
    if (!(["Admin", "President", "HR VP", "TD Team Leader", "TD Member"].includes(req.user.Position.Name) || req.user.isAdmin)) {
        res.redirect("/portal")
    }
    let id = req.query.id;
    console.log(id);
    Member.findOne({
        where: {
            id: id,
            Season: settings["CurrentSeason"].Value
        }, include: Ranking
    }).then(mem => {
        if (!mem) {
            next(createError(400));
        }
        mem.Ranking = {}
        for (let ran of mem.Rankings) {
            mem.Ranking[ran.Month] = ran.Ranking;
        }
        console.log(mem)
        if (mem) {
            res.render('portal/editrankmodal', {mem: mem});
        }
    }).catch(() => {
        next(createError(404));
    })
});
//End Ranking


// router.get('/settings', isAdmin, function (req, res, next) {
//     let id = req.query.id;
//     Applicant.findAll({
//         where: {
//             id: id
//         }
//     }).then(app => {
//         if(app){
//             res.render('portal/editmodal', {app: app[0]});
//         }
//     }).catch(() => {
//         createError(404);
//     })
// });

router.get('/members/profile/:id', isAuth, function (req, res, next) {
    let id = req.params.id;
    Member.findOne({
        where: {
            id: id
        }
    }).then(mem => {
        if (mem) {
            res.render('portal/MemberProfile', {title: `${mem.Name}'s Profile`, mem});
        }
    }).catch(() => {
        createError(404);
    })
});

router.post('/members/profile/:id', isAuth, function (req, res, next) {
    let upload = multer({storage: storage, fileFilter: imageFilter}).single('profile_image');
    let MemberId = req.params.id
    upload(req, res, function (err) {
        // req.file contains information of uploaded file
        // req.body contains information of text fields, if there were any

        if (req.fileValidationError) {
            return res.send(req.fileValidationError);
        } else if (!req.file) {
            return res.send('Please select an image to upload');
        } else if (err instanceof multer.MulterError) {
            return res.send(err);
        } else if (err) {
            return res.send(err);
        }

        Member.findOne({
            where: {
                id: req.params.id
            }

        })
            .then(function (member) {
                member.update({
                    Photo: req.file.filename,
                }).then(result => {
                    res.redirect("/portal/members/ranking/");
                    // res.render('PatientProfile', {
                    //     title: 'My Profile',
                    //     success_msg: "successfully added profile picture",
                    //     user: req.user
                    // });
                });
            })
    });
});

router.post('/members/new', isAuth, async function (req, res, next) {
    if (!(["Admin", "President", "HR VP", "TD Team Leader", "TD Member"].includes(req.user.Position.Name) || req.user.isAdmin)) {
        res.redirect("/portal")
    }
    let {Name, Phone, Email} = req.body
    let TeamName = req.body.Team
    if (!TeamName || !Name || !Phone || !Email) {
        createError(4500)
    }
    let team = await Team.findOne({where: {Name: TeamName}, include: [Directorate]})
    Member.create({
        Name,
        Phone,
        Email,
        Committee: TeamName,
        Season: settings["CurrentSeason"].Value,
        Directorate: team.Directorate.Name,
        PageID: chance.integer({min: 10000000, max: 99999999})
    }).then((newmem) => {
        res.json({msg: "Added Successfully!"});
    }).catch(() => {
        createError(4000)
    });
});

router.get('/profile', isAuth, function (req, res, next) {
    res.render("portal/MyProfile", {title: "My Profile"})
});

router.post('/profile/image', isAuth, function (req, res, next) {
    let upload = multer({storage: ProfilesStorage, fileFilter: imageFilter}).single('profile_image');
    upload(req, res, function (err) {
        // req.file contains information of uploaded file
        // req.body contains information of text fields, if there were any

        if (req.fileValidationError) {
            return res.send(req.fileValidationError);
        } else if (!req.file) {
            return res.send('Please select an image to upload');
        } else if (err instanceof multer.MulterError) {
            return res.send(err);
        } else if (err) {
            return res.send(err);
        }

        User.findOne({
            where: {
                id: res.locals.user.id
            }

        })
            .then(function (user) {
                user.update({
                    Photo: req.file.filename,
                }).then(result => {
                    res.redirect("/profile");
                    // res.render('PatientProfile', {
                    //     title: 'My Profile',
                    //     success_msg: "successfully added profile picture",
                    //     user: req.user
                    // });
                }).catch(err => {
                    next(createError(500))
                });
            })
    });
});

router.get('/profile/image/:id', isAuth, async function (req, res, next) {
    let id = req.params.id;
    let user = await User.findOne({where: {id: id}})
    const r = fs.createReadStream(`public/profiles/${user.Photo}`) // or any other way to get a readable stream
    const ps = new stream.PassThrough() // <---- this makes a trick with stream error handling
    stream.pipeline(
        r,
        ps, // <---- this makes a trick with stream error handling
        (err) => {
            if (err) {
                console.log(err) // No such file or any other kind of error
                return res.sendStatus(400);
            }
        })
    ps.pipe(res) // <---- this makes a trick with stream error handling
});

module.exports = router;
