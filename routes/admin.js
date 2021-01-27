const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models').User;
const Invite = require('../models').Invite;
const { NotAuth, isAuth } = require('../utils/filters');
const { check, validationResult, body } = require('express-validator');
const { Op } = require('sequelize');
const Chance = require('chance');



router.get("/userlist", isAuth, (req, res) => {
    User.findAll().then(
        users => {
            res.render("users", {
                title: "Users List",
                users
            });
        }
    )
});


router.post('/delete', isAuth, (req, res) => {
    User.destroy({
        where: {
            id: req.body.usersID
        }
    });
    res.redirect('/');
});


module.exports = router;