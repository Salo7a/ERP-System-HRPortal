const express = require('express');
const router = express.Router();
const Contact = require("../models").Contact;
const Applicant = require("../models").Applicant;
const {body, validationResult} = require('express-validator');
const chance = require('chance').Chance();
const querystring = require('querystring');
const { Op } = require("sequelize");
const {addSeconds, differenceInSeconds, isValid, formatDuration }= require("date-fns");
const { GoogleSpreadsheet } = require('google-spreadsheet');
const doc = new GoogleSpreadsheet('1-8s0bQnheqCar9144kMG-v1GGDtGqBMK2MryhereWJI');
let sheet;
function formatTime(time) {
    const minutes = Math.floor(time / 60);
    let seconds = time % 60;

    if (seconds < 10) {
        seconds = `0${seconds}`;
    }

    return `${minutes}:${seconds}`;
}

async function SheetSetup(){
    await doc.useServiceAccountAuth({
        client_email: "formdata@participants-form-data.iam.gserviceaccount.com",
        private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDn64TY06s14EDu\nFBn2/2kwXptUoWIUpdIBL/6GnnFSMaE1OKQJFD+V4KA7sgjDf9l5+8rij9ekVlYF\n+upzuaB9P2UHA669M5f6JrOE1VOwF3gw2tLYx0Kvra+LUwThuOyH+h/KbnlxB/xW\nzxPV806FkWnBp4z3wuOUOeu95X4Ktwfw2njCj7Jt8qkhSyfIH4qHSm6gug9FuPVQ\nr7crevjkcGpsw2qx8LU+Luuuj7o+DHsTGJUGcLCCsUgBOAT9wbtm3+WXn9hTLSgT\ntonGl0184sgI61EEzQ/s8RTBtMYrE0el4whfQ8KO1LJs/gHS29oeI2tQTRU5tL/M\nZH1kAz35AgMBAAECggEAEkHF/dgu4ZE/Z0aNkzZAynoeHfvM1+2EUkvcDG6nYtYt\nl74XWrAdf8/UqVJe8n3rabkGvA5hBkq2H6ckovrNTaLKkhJqBHKt73cxuV6eRY3Z\nbDYjtEU+ZIxGlhARYbAQLbWk4EeRV5KufIp1aCmsyCK9+azWEfCFgBcNre+lnBPt\nZtdWMK1hBofT/wmzHs5WNsOb2MNmMhNWa9H1V9R7HZvNYrZL2waeZ2IjNfkVrMHS\ntQ9gKVEHxo43evmA/qjz8Bs8vqHrjAc6xA3R3hTLvntuzCGVcQgqpn7nK3w8L1Wd\nPixREKMY7EPTzs03llzzenYyYvgFi2jQCIeT/w1/oQKBgQD1AnagKWPOs6sr5DgF\nEwOEtoo37vy18QzJOO+Xz5MZedzqbJ1bq4e6iFR1rNbDlhiw7K0qco20acCJeIm2\n2dm3EVCP+8172dK29+03RNxtgHjA5VUz1Pzj1Tkl5Y4r0XxxR6vW3Oi+evbE30a1\nPXi9sJzzML4IZDxbqzeSnch24QKBgQDyUr4UekEWEPYwvHKnbJwAAToNVEwyaSIe\n/1lmOMoFtOy0w/GBw23wTvmWT4NnJFO1XWByAUwYfrAyvhk1ZwChVOAIDTWjKuuJ\ngHAgZp3TDVtrVsBYCzGf6w6eXKeiJ9RZ171/ue9pA1/JyHDmH/6q8wimmOxnox5R\n3VNr6x3iGQKBgGaJIGII0Fc6A+G7geJFwcwxpIiiAKqX9bTkmgibe0FHKbgFupkZ\noRTkZwxUSBDUaQLqGdJQ3JLrSwN9KY0XgLDHk0Keq7EwSKn/+guOSv2crWx0zYKC\nmU8z9dWxSx11bzHtP7INA25sAYgEtQ+2aShhmF2CQZU7dbMbZYd7duChAoGBAMai\nLq+oexu0caoHf1BgRgv29XghpogYB+Ey3TxexrMg2HtgtuHwqXi3s/2TVhpA++EK\nFtm82HyntJUToKRWt3yHj1DqSxJiR0qiHsdgdnSfWVXGecpx+o6k5onHV54jWfz/\nTJWbe3UwT9+ez3TDu0S0DV5KslZNrrfaXdxzkT5ZAoGBAJhY9qhLA1jp3i3IKfTW\njfhh5M6xThxSm/UOS15Uei8Mw8SgdePLI4TPnGv1qDTJ3vnqvZY9XYDZ/k071PcP\n05QtSaxy9M56mcsC1m1hGjzYbYW3Lb5197yAsQEY9+1cz3vZB0JcL3FVYFsk1j1+\n0AK6ybCAPxfqtWVNW6pTEUoL\n-----END PRIVATE KEY-----\n",
    });
    await doc.loadInfo(); // loads document properties and worksheets
    sheet = doc.sheetsByIndex[0];
}
SheetSetup();
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
  Applicant.create({
    Token: chance.string({ length: 30, alpha: true, numeric: true })
  }).then((ap) => {
      let query = querystring.stringify({
          "token": ap.Token
      });
      return res.redirect("/application?"+query);
  }).catch(() => {
    return res.redirect("/applicationerror?code=103");
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
                return res.redirect("/tokenerror");
            }
            if(!isValid(applicant.Start)){
                console.log("New Start Time")
                applicant.Start = new Date();
                applicant.save();
            }
            let remaining = differenceInSeconds(addSeconds(applicant.Start, 1810), new Date())
        if (remaining < -30){
            res.redirect("/tokenerror")
        }
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
    Applicant.findOne({where: {Email: email}}).then((ap)=>{
        if (ap){
            return res.redirect("/applicationerror?code=101");
        }
    }).catch(()=>{
        return res.redirect("/applicationerror?code=108");
    });
    Applicant.findOne({where: {
            Token: token,
            End: null
        }}).then((applicant)=>{
        if (!applicant){
            return res.redirect("/tokenerror");
        }
        let secs = differenceInSeconds(new Date(),applicant.Start);
        if (secs > 1830){
            return res.redirect("/tokenerror");
        }
        applicant.update({
            Name: name,
            Phone: phone,
            Email: email,
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
        // sheet.addRow({
        //     ID: applicant.id,
        //     Name: name,
        //     Phone: phone,
        //     Email: email,
        //     CUStudent: custudent,
        //     Time: formatTime(secs),
        //     Faculty: faculty,
        //     Academic: academic,
        //     Major: major,
        //     Minor: minor,
        //     English: english,
        //     Courses: courses,
        //     Excur: excur,
        //     First: first,
        //     Second: second,
        //     Q1: team[0],
        //     Q2: team[1],
        //     Q3: team[2],
        //     Q4: team[3],
        //     General1: gen[0],
        //     General2: gen[1],
        //     General3: gen[2],
        //     General4: gen[3],
        //     Situational1: sit[0],
        //     Situational2: sit[1],
        //     Situational3: sit[2],
        //     End: new Date(),
        //     Start: applicant.Start
        // })
        res.redirect('/success');
    }).catch((err)=>{
        console.log(err);
        return res.redirect("/applicationerror?code=106");
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

module.exports = router;

function NoteTemplate(data){
    console.log("<li> data.text</li>")
}
