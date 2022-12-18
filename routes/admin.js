const express = require('express');
const router = express.Router();
const passport = require('passport');
const {User, Invite, Team, Directorate, Position, Rank, Question, Config, Applicant} = require('../models');
const {NotAuth, isAuth, isAdmin} = require('../utils/filters');
const {syncSettings} = require('../utils/helpers')
const {check, validationResult, body} = require('express-validator');
const {Op} = require('sequelize');
const Chance = require('chance').Chance();
const createError = require("http-errors");
const {addSeconds} = require("date-fns");

// Users List
router.get("/users", isAdmin, (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    User.findAll().then(
        users => {
            res.render("admin/userslist", {
                title: "Users List",
                users
            });
        }
    ).catch(e => {
        console.error(e)
    })
});

// Delete User
router.post('/delete', isAdmin, (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    User.destroy({
        where: {
            id: req.body.UserId
        }
    }).catch(e => {
        console.error(e)
    });
    res.send({id: req.body.UserId, msg: `#${req.body.UserId} Deleted Successfully`});
});

/*
*
* Invites
*
 */

// All Invites
router.get("/invites", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let positions = await Position.findAll()
    Invite.findAll({include: Position}).then(
        invites => {
            res.render("admin/invitesView", {
                title: "All Invites",
                invites,
                positions
            });
        }
    ).catch(e => {
        console.error(e)
    })
});

// Add Invite
router.post("/invites/add", isAdmin, (req, res, next) => {
    let {position, admin} = req.body;
    let code = Chance.string({length: 8, alpha: true, numeric: true})
    Invite.create({
        Code: code,
        PositionId: position,
        isAdmin: admin ? 1 : 0,
        Season: settings["CurrentSeason"].Value
    }).then(async invite => {
        let position = await invite.getPosition()
        res.send({
            id: invite.id, Code: invite.Code, isUsed: invite.isUsed, isAdmin: invite.isAdmin,
            Season: invite.Season, Position: position.Name, msg: "Invite Successfully Created!"
        })
    }).catch((e) => {
        console.error(e)
    })
});

// Delete Invite
router.post('/invite/delete', isAdmin, (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    Invite.destroy({
        where: {
            id: req.body.id
        }
    }).catch(e => {
        console.error(e)
    });
    res.send({id: req.body.id, msg: `#${req.body.id} Deleted Successfully`});
});

/*
*
* Ranks
*
 */

// All Ranks
router.get("/ranks", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let ranks = await Rank.findAll().catch(e => {
        console.error(e)
    })
    res.render('admin/ranksView', {title: "All Ranks", ranks})
})

// Rank Edit Form
router.get("/rank/edit", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let rank = await Rank.findOne(
        {
            where: {
                id: req.query.id
            }
        }).catch(e => {
        console.error(e)
    })
    res.render('admin/rankEdit', {rank})
})

// Edit Rank Info
router.post("/rank/edit", isAdmin, async (req, res, next) => {
    let {id, name, level, internal, directorate, team} = req.body
    Rank.findOne({where: {id}}).then((rank) => {
        rank.Name = name
        rank.Level = level
        rank.isInternal = internal ? 1 : 0
        rank.isDirectorateOnly = directorate ? 1 : 0
        rank.isTeamOnly = team ? 1 : 0
        rank.save()
        res.send({msg: "Updated Successfully"})
    }).catch(e => {
        console.error(e)
    })
})

// Add New Rank
router.post("/ranks/add", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let {name, level, internal, directorate, team} = req.body
    Rank.create({
        Name: name,
        Level: level,
        isInternal: internal ? 1 : 0,
        isDirectorateOnly: directorate ? 1 : 0,
        isTeamOnly: team ? 1 : 0
    }).then((rank => {
        res.send({
            id: rank.id,
            Name: rank.Name,
            isInternal: rank.isInternal,
            Level: rank.Level,
            isDirectorateOnly: rank.isDirectorateOnly
            ,
            isTeamOnly: rank.isTeamOnly,
            msg: "Rank Successfully Added"
        })
    })).catch(e => {
        console.error(e)
    })
})

/*
*
* Directorates
*
 */

// All Directorates
router.get("/directorates", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let directorates = await Directorate.findAll().catch(e => {
        console.error(e)
    })
    res.render('admin/directoratesView', {title: "All Directorates", directorates})
})

// Directorate Edit Form
router.get("/directorate/edit", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let directorate = await Directorate.findOne(
        {
            where: {
                id: req.query.id
            }
        }).catch(e => {
        console.error(e)
    })
    res.render('admin/directorateEdit', {directorate})
})

// Edit Directorate Info
router.post("/directorate/edit", isAdmin, async (req, res, next) => {
    let {name, dname, id} = req.body
    Directorate.findOne({where: {id}}).then((dir) => {
        dir.Name = name
        dir.DisplayName = dname
        dir.save()
        res.send({msg: "Updated Successfully"})
    }).catch(e => {
        console.error(e)
    })
})

// Add New Directorate
router.post("/directorates/add", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let {name, dname} = req.body
    Directorate.create({
        Name: name,
        DisplayName: dname
    }).then((directorate => {
        res.send({
            id: directorate.id,
            Name: directorate.Name,
            DisplayName: directorate.DisplayName,
            msg: "Directorate Successfully Added"
        })
    })).catch(e => {
        console.error(e)
    })
})

/*
*
* Teams
*
 */

// View Teams
router.get("/teams", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let teams = await Team.findAll({include: Directorate}).catch(e => {
        console.error(e)
    })
    let directorates = await Directorate.findAll().catch(e => {
        console.error(e)
    })
    res.render('admin/teamsView', {title: "All Teams", teams, directorates})
})

// Add New Team
router.post("/teams/add", isAdmin, async (req, res, next) => {
    let {name, directorate, dname, description} = req.body
    Team.create({
        Name: name,
        DirectorateId: directorate,
        DisplayName: dname,
        Description: description
    }, {include: Directorate}).then((async team => {
        let directorate = await team.getDirectorate()
        res.send({
            id: team.id,
            Name: team.Name,
            DisplayName: team.DisplayName,
            directorate: directorate.Name,
            msg: "Team Successfully Added"
        })
    })).catch(e => {
        console.error(e)
    })
})

// Team Edit Form
router.get("/team/edit", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let directorates = await Directorate.findAll().catch(e => {
        console.error(e)
    })
    let team = await Team.findOne(
        {
            where: {
                id: req.query.id
            },
            include: Directorate
        }).catch(e => {
        console.error(e)
    })
    res.render('admin/teamEdit', {team, directorates})
})

// Edit Team Info
router.post("/team/edit", isAdmin, async (req, res, next) => {
    let {name, directorate, id, dname, visible, description} = req.body
    visible = !!visible
    Team.findOne({where: {id: id}}).then(async (team) => {
        console.log(team)
        team.Name = name
        team.DirectorateId = directorate
        team.DisplayName = dname
        team.isVisible = visible
        team.Description = description
        await team.save()
        await team.reload()
        console.log(team)
        res.send({msg: "Updated Successfully"})
    }).catch(e => {
        console.error(e)
    })
})

// Delete Team
router.post('/team/delete', isAdmin, (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    Team.destroy({
        where: {
            id: req.body.id
        }
    }).catch(e => {
        console.error(e)
    });
    res.send({id: req.body.id, msg: `#${req.body.id} Deleted Successfully`});
});

/*
*
* Positions
*
 */

// View Positions
router.get("/positions", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let positions = await Position.findAll({include: [Rank, Directorate, Team]}).catch(e => {
        console.error(e)
    })
    let ranks = await Rank.findAll()
    let directorates = await Directorate.findAll()
    let teams = await Team.findAll()
    res.render('admin/positionsView', {title: "All Positions", positions, ranks, directorates, teams})
})

// Add New Position
router.post("/positions/add", isAdmin, async (req, res, next) => {
    let {name, rank, directorate, team, visible} = req.body
    Position.create({
        Name: name,
        RankId: rank ? rank : null,
        DirectorateId: directorate ? directorate : null,
        TeamId: team ? team : null,
        isVisible: visible ? 1 : 0
    }, {include: [Rank, Directorate, Team]}).then((async position => {
        console.log(position)
        let directorate = await position.getDirectorate()
        let team = await position.getTeam()
        let rank = await position.getRank()
        res.send({
            id: position.id,
            Name: position.Name,
            Directorate: directorate ? directorate.Name : "None",
            Team: team ? team.Name : "None",
            isVisible: position.isVisible,
            Rank: rank ? rank.Name : "None",
            msg: "Position Successfully Added"
        })
    })).catch(e => {
        console.error(e)
    })
})

// Position Edit Form
router.get("/position/edit", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let ranks = await Rank.findAll()
    let directorates = await Directorate.findAll()
    let teams = await Team.findAll()
    let position = await Position.findOne(
        {
            where: {
                id: req.query.id
            },
            include: [Rank, Directorate, Team]
        }).catch(e => {
        console.error(e)
    })
    res.render('admin/positionEdit', {position, directorates, ranks, teams})
})

// Edit Position Info
router.post("/position/edit", isAdmin, async (req, res, next) => {
    let {name, directorate, id, rank, team, visible} = req.body
    Position.findOne({where: {id: id}}).then((position) => {
        position.Name = name
        position.RankId = rank ? rank : null
        position.DirectorateId = directorate ? directorate : null
        position.TeamId = team ? team : null
        position.isVisible = visible ? 1 : 0
        position.save()
        res.send({msg: "Updated Successfully"})
    }).catch(e => {
        console.error(e)
    })
})

// Delete Position
router.post('/position/delete', isAdmin, (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    Position.destroy({
        where: {
            id: req.body.id
        }
    }).catch(e => {
        console.error(e)
    });
    res.send({id: req.body.id, msg: `#${req.body.id} Deleted Successfully`});
});


/*
*
* Settings
*
 */


// Settings
router.get("/settings", isAdmin, async (req, res, next) => {
    res.render('admin/settings', {title: "Website Settings"})
})

// Settings Update
router.post("/settings", isAdmin, async (req, res, next) => {
    let NewSettings =
        {
            "RecruitmentOpen": req.body.RecruitmentOpen ? 1 : 0,
            "CurrentSeason": req.body.Season,
            "SheetID": req.body.SheetID,
            "CurrentForm": req.body.CurrentForm,
            "FormTime": req.body.FormTime,
            "FormStartDate": req.body.FormStartDate,
            "FormEndDate": req.body.FormEndDate,
            "EnableOvertime": req.body.EnableOvertime ? 1 : 0,
            "SendAllToSheet": req.body.SendAllToSheet ? 1 : 0
        }
    let SettingsNames = Object.keys(NewSettings);
    try {
        await SettingsNames.forEach((SettingName) => {
            Config.findOrCreate({
                where: {Setting: SettingName},
                defaults: {
                    Value: NewSettings[SettingName]
                }
            }).then((OldSetting) => {
                if (OldSetting[0]) {
                    OldSetting[0].Value = NewSettings[SettingName]
                    OldSetting[0].save()
                }

            })
        })
        syncSettings()
    } catch (e) {
        req.flash("error", "An Error Has Occurred");
    } finally {
        req.flash("success", "Settings Updated Successfully");
        res.redirect('/admin/settings')
    }


})

/*
*
* Questions
*
 */

// Questions
router.get("/questions", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let teams = await Team.findAll()
    let questions = await Question.findAll()
    res.render('admin/questionsView', {title: "All Questions", teams, questions})
})

// Add Question
router.post("/questions/add", isAdmin, async (req, res, next) => {
    let {choice, type, text, extra, custom} = req.body
    Question.create({
        Text: text,
        Type: type,
        Choice: choice,
        isGeneral: true,
        isVisible: true,
        Season: settings["CurrentSeason"].Value,
        Extra: {
            choices: extra ? extra.split(",") : null,
            custom: custom
        }
    }).then((async question => {
        res.send({
            id: question.id,
            Text: question.Text,
            Choice: question.Choice,
            isVisible: question.isVisible,
            Season: question.Season,
            msg: "Question Successfully Added"
        })
    }))
})

// Question Edit Form
router.get("/question/edit", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let teams = await Team.findAll()
    let question = await Question.findOne(
        {
            where: {
                id: req.query.id
            }
        })
    res.render('admin/questionEdit', {teams, question})
})

// Edit Question
router.post("/question/edit", isAdmin, async (req, res, next) => {
    let {id, choice, text, type, extra, custom} = req.body
    Question.findOne({where: {id}}).then((question) => {
        question.Choice = choice
        question.Text = text
        question.Type = type
        question.Extra = {
            choices: extra ? extra.split(",") : null,
            custom: custom
        }
        question.save()
        res.send({msg: "Updated Successfully"})
    })
})

// Delete Question
router.post('/question/delete', isAdmin, (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    Question.destroy({
        where: {
            id: req.body.id
        }
    });
    res.send({id: req.body.id, msg: `#${req.body.id} Deleted Successfully`});
});

router.get('/applicant/jsonimport', isAdmin, (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let dataarray = [{}]
    dataarray.forEach((data) => {
        Applicant.findOne({where: {Email: data.email}}).then((app) => {
            if (!app) {
                return res.send({msg: "Not Found"})
            }
            let team = data['team[]'];
            let gen = data['Gen[]'];
            let sit = data['sit[]'];
            sit.push(Array.isArray(data.creativity) ? data.creativity[1] : data.creativity)
            sit.push(Array.isArray(data.effective) ? data.effective[1] : data.effective)
            let answers = {
                Team: team,
                General: gen,
                Situational: sit
            }
            let end = addSeconds(app.Start, parseInt(settings["FormTime"].Value) + 10)
            app.update({
                Name: data.name ? data.name : app.Name,
                Age: data.age ? data.age : 0,
                Phone: data.phone ? data.phone : app.Phone,
                CUStudent: data.custudent,
                State: "Applied",
                Time: 1810,
                Faculty: data.faculty,
                Academic: data.academic,
                Major: data.major,
                Minor: data.minor,
                English: data.english,
                Courses: data.courses,
                Excur: data.excur,
                First: data.first,
                Second: data.second,
                Answers: answers,
                End: end,
            })
            winston.warn(data.email + "Missing Data Added")
        })
    })

});
module.exports = router;