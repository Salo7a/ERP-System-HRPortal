const express = require('express');
const router = express.Router();
const passport = require('passport');
const {User, Invite, Team, Directorate} = require('../models');
const {NotAuth, isAuth} = require('../utils/filters');
const {check, validationResult, body} = require('express-validator');
const {Op} = require('sequelize');
const Chance = require('chance');
const createError = require("http-errors");


router.get("/users", isAuth, (req, res, next) => {
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


router.post('/delete', isAuth, (req, res, next) => {
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

router.get("/directorates", async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let directorates = await Directorate.findAll()
    res.render('admin/directoratesView', {title: "All Directorates", directorates})
})

router.get("/directorate/edit", async (req, res, next) => {
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

router.post("/directorate/edit", async (req, res, next) => {
    next()
})

router.post("/directorates/add", async (req, res, next) => {
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

router.get("/teams", async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let teams = await Team.findAll()
    res.render('admin/teams', {title: "All Teams", teams})
})

module.exports = router;