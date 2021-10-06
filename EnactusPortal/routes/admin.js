const express = require('express');
const router = express.Router();
const passport = require('passport');
const {User, Invite, Team, Directorate} = require('../models');
const {NotAuth, isAuth, isAdmin} = require('../utils/filters');
const {check, validationResult, body} = require('express-validator');
const {Op} = require('sequelize');
const Chance = require('chance');
const createError = require("http-errors");

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
    )
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
    )
});

// Add Invite
router.post("/invites/add", isAdmin, (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let {position, admin} = req.body;
    let code = Chance.string({length: 8, alpha: true, numeric: true})
    Invite.create({
        Code: code,
        PositionId: position,
        isAdmin: admin ? 1:0,
        Season: settings["CurrentSeason"].Value
    }).then(async invite => {
        let position = await invite.getPosition()
        res.send({id: invite.id, Code: invite.Code, isUsed: invite.isUsed, isAdmin: invite.isAdmin,
            Season: invite.Season, Position: position.Name, msg: "Invite Successfully Created!"})
    }).catch((e)=>{
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
    let ranks = await Rank.findAll()
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
        })
    res.render('admin/rankEdit', {rank})
})

// Edit Rank Info
router.post("/rank/edit", isAdmin, async (req, res, next) => {
    let {id, name, level, internal, directorate, team} = req.body
    Rank.findOne({where: {id}}).then((rank)=>{
        rank.Name = name
        rank.Level= level
        rank.isInternal= internal ? 1 : 0
        rank.isDirectorateOnly= directorate ? 1 : 0
        rank.isTeamOnly = team ? 1 : 0
        rank.save()
        res.send({msg: "Updated Successfully"})
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
        res.send({id: rank.id, Name: rank.Name, isInternal: rank.isInternal, Level: rank.Level, isDirectorateOnly: rank.isDirectorateOnly
            , isTeamOnly: rank.isTeamOnly, msg: "Rank Successfully Added"})
    }))
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
    let directorates = await Directorate.findAll()
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
        })
    res.render('admin/directorateEdit', {directorate})
})

// Edit Directorate Info
router.post("/directorate/edit", isAdmin, async (req, res, next) => {
    let {name, id} = req.body
    Directorate.findOne({where: {id}}).then((dir)=>{
        dir.Name = Name
        dir.save()
        res.send({msg: "Updated Successfully"})
    })
})

// Add New Directorate
router.post("/directorates/add", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let name = req.body.Name
    Directorate.create({
        Name: name
    }).then((directorate => {
        res.send({id: directorate.id, Name: directorate.Name, msg: "Directorate Successfully Added"})
    }))
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
    let teams = await Team.findAll({include: Directorate})
    let directorates = await Directorate.findAll()
    res.render('admin/teamsView', {title: "All Teams", teams, directorates})
})

// Add New Team
router.post("/teams/add", isAdmin, async (req, res, next) => {
    let {name, directorate} = req.body
    Team.create({
        Name: name,
        DirectorateId: directorate
    }, {include: Directorate}).then((async team => {
        let directorate = await team.getDirectorate()
        res.send({id: team.id, Name: team.Name, directorate: directorate.Name, msg: "Team Successfully Added"})
    }))
})

// Team Edit Form
router.get("/team/edit", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let directorates = await Directorate.findAll()
    let team = await Team.findOne(
        {
            where: {
                id: req.query.id
            },
            include: Directorate
        })
    res.render('admin/teamEdit', {team, directorates})
})

// Edit Team Info
router.post("/team/edit", isAdmin, async (req, res, next) => {
    let {name, directorate,id} = req.body
    Team.findOne({where: {id}}).then((team)=>{
        team.Name = name
        team.DirectorateId = directorate
        team.save()
        res.send({msg: "Updated Successfully"})
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
    let positions = await Position.findAll({include: [Rank, Directorate, Team]})
    let ranks = await Rank.findAll()
    let directorates = await Directorate.findAll()
    let teams = await Team.findAll()
    res.render('admin/positionsView', {title: "All Teams", positions, ranks, directorates, teams})
})

// Add New Position
router.post("/positions/add", isAdmin, async (req, res, next) => {
    let {name, rank, directorate, team, visible} = req.body
    Position.create({
        Name: name,
        RankId: rank?rank: null,
        DirectorateId: directorate?directorate: null,
        TeamId: team?team: null,
        isVisible: visible ? 1 : 0
    }, {include: [Rank, Directorate, Team]}).then((async position => {
        console.log(position)
        let directorate = await position.getDirectorate()
        let team = await position.getTeam()
        let rank = await position.getRank()
        res.send({id: position.id, Name: position.Name, Directorate: directorate?directorate.Name:"None",
            Team: team?team.Name:"None", isVisible:position.isVisible, Rank: rank?rank.Name:"None" , msg: "Position Successfully Added"})
    }))
})

// Position Edit Form
router.get("/position/edit", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let directorates = await Directorate.findAll()
    let position = await Position.findOne(
        {
            where: {
                id: req.query.id
            },
            include: [Rank, Directorate, Team]
        })
    res.render('admin/positionEdit', {position, directorates})
})

// Edit Position Info
router.post("/position/edit", isAdmin, async (req, res, next) => {
    let {name, directorate, id, rank, team, visible} = req.body
    Position.findOne({where: {id}}).then((position)=>{
        position.Name = name
        position.RankId = rank?rank: null
        position.DirectorateId = directorate?directorate: null
        position.TeamId = team?team: null
        position.isVisible = visible ? 1 : 0
        position.save()
        res.send({msg: "Updated Successfully"})
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
            "LeadershipOpen": req.body.LeadershipOpen ? 1 : 0,
            "MembershipOpen": req.body.MembershipOpen ? 1 : 0,
            "CurrentSeason": req.body.Season,
            "SheetID": req.body.SheetID,
            "CurrentForm": req.body.CurrentForm
        }
    let SettingsNames = Object.keys(NewSettings);
    try {
        await SettingsNames.forEach((SettingName)=>{
            Config.findOne({where: { Setting: SettingName}}).then((OldSetting)=>{
                OldSetting.Value = NewSettings[SettingName]
                OldSetting.save()
            })
        })
    } catch (e) {
        req.flash("error", "An Error Has Occurred");
    } finally {
        req.flash("success", "Settings Updated Successfully");
        res.redirect('/')
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
    let workshops = await Workshop.findAll()
    let questions = await Question.findAll()
    res.render('admin/questionsView', {title: "All Questions", teams, workshops, questions})
})

// Add Question
router.post("/questions/add", isAdmin, async (req, res, next) => {
    let {choice, form, text} = req.body
    Question.create({
        Text: text,
        Type: "textarea",
        Choice: choice,
        isGeneral: true,
        isVisible: true,
        Form: form,
        Season: settings["CurrentSeason"].Value
    }).then((async question => {
        res.send({id: question.id, Text: question.Text, Choice: question.Name, isVisible: question.isVisible,
            Form: question.Form, msg: "Question Successfully Added"})
    }))
})

// Question Edit Form
router.get("/question/edit", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let teams = await Team.findAll()
    let workshops = await Workshop.findAll()
    let question = await Question.findOne(
        {
            where: {
                id: req.query.id
            }
        })
    res.render('admin/questionEdit', {teams, workshops, question})
})

// Edit Question
router.post("/question/edit", isAdmin, async (req, res, next) => {
    let {id, choice, form, text} = req.body
    Question.findOne({where: {id}}).then((question)=>{
        question.Choice = choice
        question.Form = form
        question.Text = text
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

module.exports = router;