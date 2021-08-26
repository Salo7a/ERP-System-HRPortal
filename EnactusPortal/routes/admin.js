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

router.get("/teams", isAdmin, async (req, res, next) => {
    if (!req.user.isAdmin) {
        next(createError(403))
    }
    let teams = await Team.findAll()
    res.render('admin/teams', {title: "All Teams", teams})
})

module.exports = router;