const express = require('express');
const router = express.Router();
const {Applicant, Contact, Member, Ranking, Team, Question, Directorate} = require("../models");
const {body, validationResult} = require('express-validator');
const chance = require('chance').Chance();
const querystring = require('querystring');
const createError = require("http-errors");
const {Op} = require("sequelize");
const {addSeconds, differenceInSeconds, isValid, formatDuration, parseISO, parse} = require("date-fns");
const {GoogleSpreadsheet} = require('google-spreadsheet'),
    {promisify} = require('util'),
    creds = require('../config/Enactus21-d39432b22314.json');
const {formatToTimeZone} = require("date-fns-timezone");

async function AddToSheet(row) {
    const doc = new GoogleSpreadsheet(settings["SheetID"].Value);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo()
    let sheet = await doc.sheetsByTitle["All"];
    if (!sheet) {
        try {
            sheet = await doc.addSheet({title: "All", headerValues: Object.keys(row)});
        } catch (e) {
            console.log(e);
            return false;
        }

    }
    let FuncSheet = await doc.sheetsByTitle[row.First];
    let FuncSheet2 = await doc.sheetsByTitle[row.Second];
    if (!FuncSheet) {
        try {
            FuncSheet = await doc.addSheet({title: row.First, headerValues: Object.keys(row)});
        } catch (e) {
            console.log(e);
            return false;
        }

    }
    if (row.State === "Accepted") {
        row.State = "Filtered";
    }
    try {
        await sheet.addRow(row)
        await FuncSheet.addRow(row);
        await FuncSheet2.addRow(row);
        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
}
function formatTime(time) {
    const minutes = Math.floor(time / 60);
    let seconds = time % 60;

    if (seconds < 10) {
        seconds = `0${seconds}`;
    }

    return `${minutes}:${seconds}`;
}

router.get('/', function (req, res, next) {
    let formReady = null
    if (parseInt(settings["RecruitmentOpen"].Value) && settings["FormStartDate"]) {

        let formtimeleft = differenceInSeconds(new Date(settings["FormStartDate"].Value), new Date())
        formReady = (formtimeleft <= 0)
    }
    res.render('index', {title: "Home", formReady});

});

router.get('/teams', function (req, res, next) {
    let formReady = null
    if (parseInt(settings["RecruitmentOpen"].Value) && settings["FormStartDate"]) {

        let formtimeleft = differenceInSeconds(new Date(settings["FormStartDate"].Value), new Date())
        formReady = (formtimeleft <= 0)
    }
    res.render('teams', {title: "Teams", formReady});
});

router.get('/contact', function (req, res, next) {
    let formReady = null
    if (parseInt(settings["RecruitmentOpen"].Value) && settings["FormStartDate"]) {

        let formtimeleft = differenceInSeconds(new Date(settings["FormStartDate"].Value), new Date())
        formReady = (formtimeleft <= 0)
    }
    res.render('contact', {title: "Contact Us", formReady});
});

router.get('/apply', function (req, res, next) {
    let formReady = null
    if (parseInt(settings["RecruitmentOpen"].Value) && settings["FormStartDate"]) {

        let formtimeleft = differenceInSeconds(new Date(settings["FormStartDate"].Value), new Date())
        formReady = (formtimeleft <= 0)
    }
    res.render('recruitment/apply', {title: "New Member Application", formReady});
});

router.get('/browsererror', function (req, res, next) {
    if (req.useragent["isFacebook"]) {
        return res.render("recruitment/browsererror", {title: "Browser Error"});
    } else {
        return res.redirect('/apply');
    }

});

router.post('/contact', [
    body('email').isEmail(),
    body('name').not().isEmpty(),
    body('subject').not().isEmpty(),
    body('message').not().isEmpty(),
    body('validation').equals("Egypt").withMessage("Incorrect Answer")
], async function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array(),
            msg: "Message not sent."
        });
    }
    const secret_key = process.env.CAPTCHA_SECRET_KEY;
    const token = req.body['g-recaptcha-response'];
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret_key}&response=${token}`;
    winston.info(`Recaptcha user token ${token}`)
    let response = await fetch(url, {
        method: 'post'
    })
    let responseJSON = await response.json();
    if (responseJSON.success) {
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
    } else {
        return res.status(400).json({msg: "Invalid Captcha"});
    }


});

router.post('/apply', function (req, res, next) {
    if (res.locals.settings['RecruitmentOpen'].Value === '0') {
        return res.redirect('/apply');
    }
    // if (req.useragent["isFacebook"]) {
    //     return res.redirect("/browsererror")
    // }
    let {name, phone, email} = req.body;
    req.useragent["IP"] = req.clientIp
    Applicant.findOne({where: {Email: email}}).then((app) => {
        if (!app) {
            Applicant.create({
                Name: name,
                Email: email,
                Phone: phone,
                Token: chance.string({length: 30, alpha: true, numeric: true}),
                Season: settings["CurrentSeason"].Value,
                Info: req.useragent
            }).then((ap) => {
                let query = querystring.stringify({
                    "token": ap.Token
                });
                return res.redirect("/application?" + query);
            }).catch(() => {
                return res.redirect("/applicationerror?code=103");
            })
        }
    }).catch((err) => {
        req.flash('error', 'Email Exists!');
    })

});

router.post('/checkemail', ((req, res, next) => {
    let email = req.body.email;
    winston.warn(new Date() + "Check Email: " + email)
    Applicant.findOne({where: {Email: email, Season: settings["CurrentSeason"].Value}}).then((app) => {
        if (app) {
            winston.warn(new Date() + "Found");
            res.send({msg: "found"});
        } else {
            winston.warn(new Date() + "Not Found");
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
    if (req.query.code) {
        code = req.query.code;
    } else {
        code = null;
    }
    res.render('recruitment/errorinform', {title: "Application Wasn't Submitted", code: code});
});

router.get('/application', async function (req, res, next) {
    let token = req.query.token;
    let choices = await Team.findAll({
        where: {isVisible: true},
        include: Directorate,
        order: [['DirectorateId', 'ASC']]
    })
    let season = settings["CurrentSeason"].Value
    let questions = await Question.GetGroupedQuestions(season)
    while (!questions || !questions.General || !questions.Situational) {
        season -= 1
        if (season < 2022) {
            next(createError(454))
        }
        questions = await Question.GetGroupedQuestions(season)
    }
    let TeamQuestions = {}
    let keys = Object.keys(questions);
    await keys.forEach((key, index) => {
        if (key !== "General" && key !== "Situational") {
            TeamQuestions[key] = []
            questions[key].forEach((question) => TeamQuestions[key].push(question.Text))
        }
    });
    Applicant.findOne({
        where:
            {
                Token: token,
                End: null
            }
    }).then((applicant) => {
        if (!applicant) {
            winston.warn(new Date() + "Wrong Token")
            return res.redirect("/tokenerror");
        }
        if (!isValid(applicant.Start)) {
            winston.warn(new Date() + "New Start Time")
            applicant.Start = new Date();
            applicant.save();
        }
        let remaining = differenceInSeconds(addSeconds(applicant.Start, parseInt(settings["FormTime"].Value) + 10), new Date())
        if (remaining < -200) {
            winston.warn(new Date() + applicant.Email + " : Time Out App " + remaining)
            res.redirect("/tokenerror");
        }
        winston.warn(new Date() + applicant.Email + " : Start: " + applicant.Start)
        res.render('recruitment/application', {
            title: "New Member Application Questions",
            remaining: remaining, token: token, choices, questions, TeamQuestions: JSON.stringify(TeamQuestions)
        });
    }).catch(() => {
        return res.redirect("/applicationerror?code=104");
    })

});

router.post('/application', function (req, res, next) {
    let {
        token,
        name,
        age,
        email,
        phone,
        custudent,
        faculty,
        academic,
        major,
        minor,
        english,
        courses,
        excur,
        first,
        second,
        creativity,
        effective
    } = req.body;
    let team = req.body['team[]'];
    let gen = req.body['Gen[]'];
    let sit = req.body['sit[]'];
    sit.push(Array.isArray(creativity) ? creativity[1] : creativity)
    sit.push(Array.isArray(effective) ? effective[1] : effective)
    let answers = {
        Team: team,
        General: gen,
        Situational: sit
    }
    console.error(req.body);
    let state = "Applied"
    let end = new Date();
    if (!team) {
        winston.warn("No Team Questions " + email)
        end = null
        state = "In Progress"
    }

    Applicant.findOne({
        where: {
            Token: token,
            End: null
        }
    }).then((applicant) => {
        if (!applicant) {
            winston.warn(new Date() + email + ": No Open Token");
            return res.redirect("/tokenerror");
        }
        let secs = differenceInSeconds(new Date(), applicant.Start);
        if (secs > (parseInt(settings["FormTime"].Value) * 1.1)) {
            winston.warn(new Date() + email + ": Timed Out " + secs);
            // return res.redirect("/tokenerror");
            state = "Overtime"
        }
        applicant.update({
            Name: name ? name : applicant.Name,
            Age: age ? age : 0,
            Phone: phone ? phone : applicant.Phone,
            CUStudent: custudent,
            State: state,
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
            End: end,
        }).then(app => {
            if (end) {
                let data = {
                    ID: app.id,
                    Name: app.Name,
                    Age: app.Age,
                    Phone: app.Phone,
                    Email: app.Email,
                    CUStudent: app.CUStudent,
                    State: app.State,
                    Time: app.Time,
                    Faculty: app.Faculty,
                    Academic: app.Academic,
                    Major: app.Major,
                    Minor: app.Minor,
                    English: app.English,
                    Excur: app.Excur,
                    Courses: app.Courses,
                    First: app.First,
                    Second: app.Second,
                    End: formatToTimeZone(app.End, "ddd MMM DD YYYY HH:mm:ss [GMT]Z (z)", {timeZone: 'Africa/Cairo'}),
                    Start: formatToTimeZone(app.Start, "ddd MMM DD YYYY HH:mm:ss [GMT]Z (z)", {timeZone: 'Africa/Cairo'}),
                    ITime: app.ITime,
                    IDate: app.IDate,
                    ATime: app.ATime,
                    Season: app.Season
                }
                AddToSheet(data)
            }

        })

        if (end == null) {
            res.redirect("/application/continue?token=" + token)
        } else {
            res.redirect('/success');
        }
    }).catch((err) => {
        winston.error(err);
        return res.redirect("/applicationerror?code=106");
    })

});

router.post('/applicationajax', function (req, res, next) {
    let {
        token,
        name,
        age,
        email,
        phone,
        custudent,
        faculty,
        academic,
        major,
        minor,
        english,
        courses,
        excur,
        first,
        second,
        creativity,
        effective
    } = req.body;
    let team = req.body['team[]'];
    let gen = req.body['Gen[]'];
    let sit = req.body['sit[]'];
    sit.push(Array.isArray(creativity) ? creativity[1] : creativity)
    sit.push(Array.isArray(effective) ? effective[1] : effective)
    let answers = {
        Team: team,
        General: gen,
        Situational: sit
    }
    winston.warn("AppAJAX: " + email + new Date());
    console.error(req.body);
    let state = "Applied"
    Applicant.findOne({
        where: {
            Token: token,
            End: null
        }
    }).then((applicant) => {
        if (!applicant) {
            return res.status(400).json({msg: "Error"});
        }
        let secs = differenceInSeconds(new Date(), applicant.Start);
        if (secs > (parseInt(settings["FormTime"].Value) * 1.14)) {
            state = "Overtime"
            return res.status(400).json({msg: "Error"});
        }
        applicant.update({
            Name: name ? name : applicant.Name,
            Age: age ? age : 0,
            Phone: phone ? phone : applicant.Phone,
            CUStudent: custudent,
            State: state,
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
        }).then(app => {
            let data = {
                ID: app.id,
                Name: app.Name,
                Age: app.Age,
                Phone: app.Phone,
                Email: app.Email,
                CUStudent: app.CUStudent,
                State: app.State,
                Time: app.Time,
                Faculty: app.Faculty,
                Academic: app.Academic,
                Major: app.Major,
                Minor: app.Minor,
                English: app.English,
                Excur: app.Excur,
                Courses: app.Courses,
                First: app.First,
                Second: app.Second,
                End: formatToTimeZone(app.End, "ddd MMM DD YYYY HH:mm:ss [GMT]Z (z)", {timeZone: 'Africa/Cairo'}),
                Start: formatToTimeZone(app.Start, "ddd MMM DD YYYY HH:mm:ss [GMT]Z (z)", {timeZone: 'Africa/Cairo'}),
                ITime: app.ITime,
                IDate: app.IDate,
                ATime: app.ATime,
                Season: app.Season
            }
            AddToSheet(data)
        })
        res.status(200).json({msg: "Done"});
    }).catch((err) => {
        console.log(err);
        return res.status(400).json({msg: "Error"});
    })

});

router.get('/application/continue', async function (req, res, next) {
    let token = req.query.token;
    let choices = await Team.findAll({
        where: {isVisible: true},
        include: Directorate,
        order: [['DirectorateId', 'ASC']]
    })
    let questions = await Question.GetGroupedQuestions(settings["CurrentSeason"].Value)
    let TeamQuestions = {}
    let keys = Object.keys(questions);
    await keys.forEach((key, index) => {
        if (key !== "General" && key !== "Situational") {
            TeamQuestions[key] = []
            questions[key].forEach((question) => TeamQuestions[key].push(question.Text))
        }
    });
    Applicant.findOne({
        where:
            {
                Token: token
            }
    }).then((applicant) => {
        if (!applicant) {
            winston.warn(new Date() + "Wrong Token")
            return res.redirect("/tokenerror");
        }
        if (!isValid(applicant.Start)) {
            winston.warn(new Date() + "New Start Time")
            applicant.Start = new Date();
            applicant.save();
        }
        if (applicant.Answers.Team) {
            return res.redirect("/applicationerror?code=134")
        }
        let remaining = differenceInSeconds(addSeconds(applicant.Start, parseInt(settings["FormTime"].Value) + 10), new Date())
        // if (remaining < -200) {
        //     winston.warn(new Date() + applicant.Email + " : Time Out App " + remaining)
        //     res.redirect("/tokenerror");
        // }
        if (remaining < 240) {
            remaining = 240
        }
        winston.warn(new Date() + applicant.Email + " : Team Question Start: " + applicant.Start)
        res.render('recruitment/applicationTeamOnly', {
            title: "New Member Application Questions, Part 2",
            remaining: remaining,
            token: token,
            choices,
            questions,
            TeamQuestions: TeamQuestions,
            app: applicant
        });
    }).catch(() => {
        return res.redirect("/applicationerror?code=104");
    })

});

router.post('/application/continue', async function (req, res, next) {
    let token = req.body.token;
    let team = req.body['team[]'];
    winston.warn("Teams Submit " + req.body.email)
    console.error(req.body)
    Applicant.findOne({
        where:
            {
                Token: token
            }
    }).then((applicant) => {
        if (!applicant) {
            winston.warn(new Date() + "Wrong Token (Teams)")
            return res.redirect("/tokenerror");
        }
        let NewAnswers = applicant.Answers;
        NewAnswers.Team = team
        if (applicant.End == null) {
            applicant.update({
                Answers: NewAnswers,
                End: new Date(),
                State: "Applied",
                Time: differenceInSeconds(new Date(), applicant.Start)
            }).then(app => {
                console.log(app)
                res.redirect("/success")
            })
        } else {
            applicant.update({
                Answers: NewAnswers,
                Notes: "External Teams Questions"
            }).then(app => {
                console.log(app)
                res.redirect("/success")
            })
        }
        let data = {
            ID: applicant.id,
            Name: applicant.Name,
            Age: applicant.Age,
            Phone: applicant.Phone,
            Email: applicant.Email,
            CUStudent: applicant.CUStudent,
            State: applicant.State,
            Time: applicant.Time,
            Faculty: applicant.Faculty,
            Academic: applicant.Academic,
            Major: applicant.Major,
            Minor: applicant.Minor,
            English: applicant.English,
            Excur: applicant.Excur,
            Courses: applicant.Courses,
            First: applicant.First,
            Second: applicant.Second,
            End: formatToTimeZone(applicant.End, "ddd MMM DD YYYY HH:mm:ss [GMT]Z (z)", {timeZone: 'Africa/Cairo'}),
            Start: formatToTimeZone(applicant.Start, "ddd MMM DD YYYY HH:mm:ss [GMT]Z (z)", {timeZone: 'Africa/Cairo'}),
            ITime: applicant.ITime,
            IDate: applicant.IDate,
            ATime: applicant.ATime,
            Season: applicant.Season
        }
        AddToSheet(data)
    }).catch(() => {
        return res.status(400).json({msg: "Error"});
    })

});

router.post('/application/continueajax', async function (req, res, next) {
    let token = req.body.token;
    let team = req.body['team[]'];
    winston.warn("Teams Submit " + req.body.email)
    console.error(req.body)
    Applicant.findOne({
        where:
            {
                Token: token
            }
    }).then((applicant) => {
        if (!applicant) {
            winston.warn(new Date() + "Wrong Token (Teams)")
            return res.redirect("/tokenerror");
        }
        let NewAnswers = applicant.Answers;
        NewAnswers.Team = team
        if (applicant.End == null) {
            applicant.update({
                Answers: NewAnswers,
                End: new Date(),
                State: "Applied",
                Time: differenceInSeconds(new Date(), applicant.Start)
            }).then(app => {
                console.log(app)
                res.status(200).json({msg: "Done"});
            })
        } else {
            applicant.update({
                Answers: NewAnswers,
                Notes: "External Teams Questions"
            }).then(app => {
                console.log(app)
                res.status(200).json({msg: "Done"});
            })
        }
    }).then(() => {
        res.status(200).json({msg: "Done"});
    }).catch(() => {
        return res.redirect("/applicationerror?code=114");
    })

});

router.get('/checktime', ((req, res, next) => {
    let token = req.query.token;
    Applicant.findOne({
        where: {
            Token: token,
            End: null
        }
    }).then((applicant) => {
        if (!applicant) {
            return res.status(400).json({msg: "Token Not Found"});
        }
        let passed = differenceInSeconds(new Date(), applicant.Start)
        res.send({msg: "Found", passed});
    }).catch(() => {
        return res.status(400).json({msg: "Token Not Found"});
    })
}))

router.get('/members/performance/:PageID', function (req, res, next) {
    Member.findOne({
        where: {
            PageID: req.params.PageID
        }
    }).then(mem => {
        if (mem.Committee === "TD" && !mem.Seen) {

            res.render('portal/kpiprank', {title: "Performance Report", mem});
        } else {
            res.render('performance', {title: "Performance Report", mem});
        }

    }).catch(() => {
            createError(404);
        }
    )

});

router.post('/members/performance/:PageID', function (req, res, next) {
    Member.findOne({
        where: {
            PageID: req.params.PageID
        }
    }).then(mem => {
        mem.Seen = true;
        mem.save();
        res.send(200)

    }).catch(() => {
            createError(404);
        }
    )

});

router.get('/members/pokenactus/', function (req, res, next) {
    let d = new Date();
    let month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let Month = month[d.getMonth()];
    console.log(Month)
    res.render('leaderboard', {title: "Pokenactus Leaderboard", Month});
});

router.get('/members/pokenactus/:Month', function (req, res, next) {
    let Month = req.params.Month
    res.render('leaderboard', {title: "Pokenactus Leaderboard", Month});
});

router.get('/members/leaderboard/:Directorate', function (req, res, next) {
    console.log("Hi")
    Ranking.findAll({
        where: {
            Directorate: req.params.Directorate,
            Month: settings["CurrentRankingMonth"].Value,
            Season: settings["CurrentSeason"].Value
        },
        include: Member,
        order: [
            ['Ranking', 'ASC'],
        ]
    }).then(members => {
        // if (members.length > 3){
        res.render('singleleaderboard', {title: "Leaderboard", members});
        // } else {
        //     res.render('message', {title: "Hmmmm"});
        // }

    }).catch(() => {
            createError(404);
        }
    )

});

router.get('/members/leaderboard/:Directorate/:Month', function (req, res, next) {
    let Month = req.params.Month
    Ranking.findAll({
        where: {
            Directorate: req.params.Directorate,
            Month: Month
        },
        include: Member,
        order: [
            ['Ranking', 'ASC'],
        ]
    }).then(members => {
        // if (members.length > 3){
        res.render('singleleaderboard', {title: "Leaderboard", members});
        // } else {
        //     res.render('message', {title: "Hmmmm"});
        // }

    }).catch(() => {
            createError(404);
        }
    )

});

module.exports = router;
