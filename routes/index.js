const express = require('express');
const router = express.Router();
const Contact = require("../models").Contact;
const Applicant = require("../models").Applicant;
const Member = require("../models").Member;
const {body, validationResult} = require('express-validator');
const chance = require('chance').Chance();
const querystring = require('querystring');
const createError = require("http-errors");
const { Op } = require("sequelize");
const {addSeconds, differenceInSeconds, isValid, formatDuration }= require("date-fns");
function formatTime(time) {
    const minutes = Math.floor(time / 60);
    let seconds = time % 60;

    if (seconds < 10) {
        seconds = `0${seconds}`;
    }

    return `${minutes}:${seconds}`;
}

router.get('/', function (req, res, next) {
    res.render('index', {title: "Home"});
});

router.get('/teams', function (req, res, next) {
    res.render('teams', {title: "Teams"});
});

router.get('/contact', function (req, res, next) {
    res.render('contact', {title: "Contact Us"});
});

router.get('/apply', function (req, res, next) {
    res.render('recruitment/apply', {title: "New Member Application"});
});

router.post('/contact', [
    body('email').isEmail(),
    body('name').not().isEmpty(),
    body('subject').not().isEmpty(),
    body('message').not().isEmpty()
], function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array(),
            msg: "Message not sent."
        });
    }
    let {name, email, subject, message} = req.body;
    Contact.create({
        Name: name,
        Email: email,
        Subject: subject,
        Message: message
    }).then(() => {
        return res.send({msg: "We have received your message"});
    }).catch(() => {
        return res.status(400).json({msg: "Message not sent."});
    })

});

router.post('/apply' , function (req, res, next) {
    if (res.locals.settings['RecruitmentOpen'].Value === '0')
    {
        return res.redirect('/apply');
    }
    let {name, phone,email} = req.body;

  Applicant.findOne({where:{Email: email}}).then((app)=>{
      if (!app){
          Applicant.create({
              Name: name,
              Email: email,
              Phone: phone,
              Token: chance.string({ length: 30, alpha: true, numeric: true })
          }).then((ap) => {
              let query = querystring.stringify({
                  "token": ap.Token
              });
              return res.redirect("/application?"+query);
          }).catch(() => {
              return res.redirect("/applicationerror?code=103");
          })
      }
  }).catch((err)=>{
      req.flash('error', 'Email Exists!');
  })

});

router.post('/checkemail',((req, res, next) =>{
  let email = req.body.email;
  console.log(email)
  Applicant.findOne({where: {Email: email}}).then((app)=>{
    if (app){
      console.log("Found");
      res.send({msg: "found"});
    } else {
      console.log("Not Found");
      res.send({msg: "non"})
    }
  });
}))

router.get('/success', function (req, res, next) {
  res.render('recruitment/success', {title: "Application Submitted Successfully"});
});
router.get('/tokenerror', function (req, res, next) {
  res.render('recruitment/tokenerror', {title: "Application Wasn't Submitted"});
});
router.get('/tokenexpired', function (req, res, next) {
    res.render('recruitment/tokenerror', {title: "Application Has Expired"});
});
router.get('/timeout', function (req, res, next) {
    res.render('recruitment/timeout', {title: "Timeout"});
});
router.get('/applicationerror', function (req, res, next) {
    let code;
    if(req.query.code){
        code = req.query.code;
    } else {
        code = null;
    }
  res.render('recruitment/errorinform', {title: "Application Wasn't Submitted", code: code});
});
router.get('/application', function (req, res, next) {
    let token = req.query.token;
    Applicant.findOne({where:
            {
            Token: token,
            End: null
        }}).then((applicant)=>{
            if (!applicant){
                console.log("Wrong Token")
                return res.redirect("/tokenerror");
            }
            if(!isValid(applicant.Start)){
                console.log("New Start Time")
                applicant.Start = new Date();
                applicant.save();
            }
            let remaining = differenceInSeconds(addSeconds(applicant.Start, 1810), new Date())
        if (remaining < -200)
        {
            console.log(applicant.Email + " : Time Out App " + remaining)
            res.redirect("/tokenerror");
        }
            console.log(applicant.Email + " : Start: " + applicant.Start )
            res.render('recruitment/application', {title: "New Member Application Questions",
            remaining: remaining, token:token});
    }).catch(()=>{
        return res.redirect("/applicationerror?code=104");
    })

});
router.post('/application',function (req, res, next) {
    let {token, name, email, phone, custudent, faculty, academic, major, minor, english, courses, excur, first, second} = req.body;
    let team=req.body['team[]'];
    let gen=req.body['Gen[]'];
    let sit=req.body['sit[]'];
    let answers = {
        Team: team,
        General: gen,
        Situational:sit
    }
    console.log(req.body);
    Applicant.findOne({where: {
            Token: token,
            End: null
        }}).then((applicant)=>{
        if (!applicant){
            console.log(email + ": No Open Token");
            return res.redirect("/tokenerror");
        }
        let secs = differenceInSeconds(new Date(),applicant.Start);
        if (secs > 2200){
            console.log(email + ": Timed Out "+ secs);
            return res.redirect("/tokenerror");
        }
        applicant.update({
            Name: name,
            Phone: phone,
            CUStudent: custudent,
            State: "Applied",
            Time: secs,
            Faculty: faculty,
            Academic: academic,
            Major: major,
            Minor: minor,
            English: english,
            Courses: courses,
            Excur: excur,
            First: first,
            Second: second,
            Answers: answers,
            End: new Date(),
        })
        res.redirect('/success');
    }).catch((err)=>{
        console.log(err);
        return res.redirect("/applicationerror?code=106");
    })

});
router.post('/applicationajax',function (req, res, next) {
    let {token, name, email, phone, custudent, faculty, academic, major, minor, english, courses, excur, first, second} = req.body;
    let team=req.body['team[]'];
    let gen=req.body['Gen[]'];
    let sit=req.body['sit[]'];
    let answers = {
        Team: team,
        General: gen,
        Situational:sit
    }
    console.log("AppAJAX: " + email + new Date());
    console.log(req.body);
    Applicant.findOne({where: {
            Token: token,
            End: null
        }}).then((applicant)=>{
        if (!applicant){
            return res.status(400).json({msg: "Error"});
        }
        let secs = differenceInSeconds(new Date(),applicant.Start);
        if (secs > 2200){
            return res.status(400).json({msg: "Error"});
        }
        applicant.update({
            Name: name,
            Phone: phone,
            CUStudent: custudent,
            State: "Applied",
            Time: secs,
            Faculty: faculty,
            Academic: academic,
            Major: major,
            Minor: minor,
            English: english,
            Courses: courses,
            Excur: excur,
            First: first,
            Second: second,
            Answers: answers,
            End: new Date(),
        })
        res.status(200).json({msg: "Done"});
    }).catch((err)=>{
        console.log(err);
        return res.status(400).json({msg: "Error"});
    })

});

router.post('/checktime',((req, res, next) =>{
    let token = req.query.token;
    Applicant.findOne({where: {
            Token: token,
            End: null
        }}).then((applicant)=>{
        if (!applicant){
            return res.status(400).json({msg: "Token Not Found"});
        }
        let remaining = differenceInSeconds(addSeconds(applicant.Start, 1810), new Date())
        res.send({msg: "Found", remaining: remaining});
    }).catch(()=>{
        return res.status(400).json({msg: "Token Not Found"});
    })
}))

router.get('/members/performance/:PageID', function (req, res, next) {
    Member.findOne({where:{
        PageID: req.params.PageID
        }}).then(mem=>{
        res.render('performance', {title: "Performance Report", mem});
    }).catch(()=>{
        createError(404);
    }
    )

});
module.exports = router;
