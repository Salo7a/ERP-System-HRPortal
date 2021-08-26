const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models').User;
const Invite = require('../models').Invite;
const { NotAuth, isAuth } = require('../utils/filters');
const { check, validationResult, body } = require('express-validator');
const { Op } = require('sequelize');
const Chance = require('chance');

function issueToken(user, done) {
    let chance = new Chance();
    let token = chance.word({ length: 60 });
    user.update({
        RememberHash: token
    }).then(result => {
        return done(null, token);
    }).catch(err => {
        return done(err);
    })
}

router.get('/login', NotAuth, function (req, res, next) {
    res.render('auth/login', {
        title: 'Login'
    });
});

router.post('/login', NotAuth, passport.authenticate('local', {
    failureRedirect: '/auth/login',
    failureFlash: true
}), function (req, res, next) {
    req.flash('success', 'You\'ve Logged In Successfully');
    if (!req.body.remember_me) {
        return next();
    }

    issueToken(req.user, function (err, token) {
        if (err) {
            return next(err);
        }
        res.cookie('remember_me', token, { path: '/', httpOnly: true, maxAge: 604800000 });
        return next();
    });
},
    function (req, res) {
        res.redirect('/portal');
    });

router.get('/register',NotAuth, (req,res,next)=>{
    res.render('auth/register', {title: "Registration"});
});

router.post('/register', [
    check('email').trim().isEmail().withMessage('Invalid Email').normalizeEmail(),
    check('password').isLength({min: 6}).withMessage('Password Must Be At Least 6 Chars Long'),
    body('password2').custom((value, {req}) => {
        if (value !== req.body.password) {
            throw new Error('Passwords Don\'t Match');
        }
        // Indicates the success of this synchronous custom validator
        return true;
    }),
    check('phone').trim().isMobilePhone("any").withMessage('Invalid Phone Number').escape(),

], NotAuth, function (req, res, next) {
    const errors = validationResult(req);
    console.log(errors);
    console.log(req.body);
    if (!errors.isEmpty()) {
        return res.render('auth/register', {
            req: req.body,
            title: "Register",
            errors: errors.array()
        });
        //res.status(422).json({ errors: errors.array() });
    }
    let chance = new Chance();
    const {name, email, password, phone, invite, username} = req.body;
    Invite.findOne({where: {
        Code: invite,
        Used: false
        }}).then((inv)=>{
            if (!inv){
                res.redirect("/auth/invalidinvite")
            }
            let position = inv.Position;
            let committee = inv.Committee;
            let rep = inv.Rep
        User.findOne({
            where: {
                [Op.or]: [
                    {Email: email},
                    {Phone: phone}
                ]
            },
            attributes: ['email']
        })
            .then(user => {
                if (!user) {
                    let hash = chance.string({length: 128});
                    // create that user as no one by that username exists
                    User.create({
                        Name: name,
                        Email: email,
                        Password: password,
                        Phone: phone,
                        ActiveHash: hash,
                        Username: username,
                        Position: position,
                        Committee: committee,
                        Rep: rep
                    })
                        .then(function ()
                            {
                                inv.Used = true;
                                inv.save();
                                req.flash('success', 'The user was registered successfully');
                                res.redirect('/auth/login');
                            }
                        ).catch(function (err, user) {
                            throw err;
                        }
                    );
                } else {
                    req.flash('error', "Account Already Exists");
                    res.render('auth/register', {
                        user: req.user,
                        message: "Account Already Exists",
                        title: "Register"
                    });
                }
            })
            .catch(function (err) {
                throw err;
            })
    })

});

router.get('/logout', isAuth, function (req, res, next) {
    res.clearCookie('remember_me');
    req.logout();
    req.flash('success', "You're Logged Out");
    res.redirect('/auth/login');
});


router.get('/invalidinvite', isAuth, function (req, res, next) {
    res.render('/auth/invalidinvite');
});

module.exports = router;