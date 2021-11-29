let express = require('express');
const createError = require("http-errors");
let router = express.Router();
const {NotAuth, isAuth, isAdmin, imageFilter} = require('../utils/filters');
const {Applicant, Contact, Member, Ranking, Question, Position, Rank, Directorate, Team} = require("../models");
const chance = require('chance').Chance();
const {Op} = require("sequelize");
const sequelize = require('sequelize');
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

async function UpdateState(id, state) {
    const doc = new GoogleSpreadsheet(settings["SheetID"].Value);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo()
    let sheet = await doc.sheetsByTitle["All"];
    let AllRows = await sheet.getRows();
    // let FuncSheet = await doc.sheetsByTitle[row.First];
    // let FuncSheet2 = await doc.sheetsByTitle[row.Second];
    let start = 0, end = AllRows.length - 1, index = null;

    // Iterate while start not meets end
    while (start <= end) {

        // Find the mid index
        let mid = Math.floor((start + end) / 2);

        // If element is present at mid, return True
        if (parseInt(AllRows[mid].ID) === id) {
            index = mid
            break
        }

        // Else look in left or right half accordingly
        else if (parseInt(AllRows[mid].ID) < id)
            start = mid + 1;
        else
            end = mid - 1;
    }
    if (index != null) {
        try {
            AllRows[index].State = state;
            await AllRows[index].save();
            return true;
        } catch (e) {
            console.log(e);
            winston.warn("Failed to update row")
            return false;
        }
    } else {
        winston.warn("Failed to update row, ID Not Found: " + id)
        return false;
    }

}
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
                    Committee: req.user.Rep
                }
        })
    } else {
        mem = await Member.findAll()
    }

    res.render('portal/membersview', {title: "All Members", members: mem});


});


router.post('/editkpi', isAuth, async function (req, res, next) {
    if (!(["Admin", "President", "HR VP", "TD Team Leader", "TD Member"].includes(req.user.Position.Name) || req.user.isAdmin)) {
        res.redirect("/portal")
    }
    let {January, February, March, April, May, June, July} = req.body
    Member.findOne({
        where: {
            id: req.body.id
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
            id: id
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
                    Committee: req.user.Rep
                }
        })
    } else {
        mem = await Member.findAll()
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
            id: id
        }, include: Ranking
    }).then(mem => {
        mem.Ranking = {}
        for (let ran of mem.Rankings) {
            mem.Ranking[ran.Month] = ran.Ranking;
        }
        console.log(mem)
        if (mem) {
            res.render('portal/editrankmodal', {mem: mem});
        }
    }).catch(() => {
        createError(404);
    })
});
//End Ranking

router.get('/applicants/all', isAuth, function (req, res, next) {
    if (!(["Admin", "President", "Marketing VP", "Projects VP", "Financial VP", "Multimedia VP", "HR VP", "TD Team Leader", "OD Team Leader", "L&D Team Leader"].includes(req.user.Position.Name) || req.user.isAdmin)) {
        res.redirect("/portal")
    }
    Applicant.findAll({
        where: {
            State: {
                [Op.ne]: null
            },
            Season: settings["CurrentSeason"].Value
        }
    }).then(app => {
        res.render('portal/applicantsview', {title: "All Applicants", applicants: app});
    }).catch(() => {
        createError(404);
    })

});

router.get('/applicants/my', isAuth, async function (req, res, next) {
    let Position = req.user.Position;
    let rank = await Position.getRank();
    if (rank.Level < 2) {
        next(createError(403));
    }
    let team = await Position.getTeam();
    let state = "Accepted";
    if (team.Name === "Marketing" || team.Name === "Visuals" || team.Name === "Projects") {
        state = ["Accepted", "Rejected"];
    }
    Applicant.findAll({
        where: {
            State: state,
            [Op.or]: [{First: team.Name}, {Second: team.Name}],
            Season: settings["CurrentSeason"].Value
        }
    }).then(app => {
        res.render('portal/applicantsview', {title: `${team.Name} Applicants`, applicants: app});
    }).catch(() => {
        createError(404);
    })

});

router.get('/applicants/bydate/', isAuth, function (req, res, next) {
    let date;
    if (req.query.date === undefined) {
        date = formatToTimeZone(new Date(), "DD-MMM-YYYY", {timeZone: 'Africa/Cairo'});
    } else {
        date = req.query.date;
    }
    console.log(date);
    Applicant.findAll({
        where: {
            IDate: date,
            Season: settings["CurrentSeason"].Value
        }
    }).then(app => {
        console.log(app);
        res.render('portal/applicantsiview', {title: `Today's Interviews`, applicants: app});
    }).catch(() => {
        createError(404);
    })

});

router.get('/applicants/filter', isAuth, function (req, res, next) {
    Applicant.findAll({
        where: {
            Name: {
                [Op.ne]: null
            },
            Season: settings["CurrentSeason"].Value
        }
    }).then(app => {
        res.render('portal/applicantsfilterview', {title: "Unfiltered Applicants", applicants: app});
    }).catch(() => {
        createError(404);
    })
});

router.post('/applicants/filter', isAuth, function (req, res, next) {
    let id = req.body.id;
    Applicant.findOne({
        where: {id: id, Season: settings["CurrentSeason"].Value}
    }).then((app) => {
        let name = app.Name;
        app.destroy();
        res.send({msg: `Deleted #${id} - ${name}`, id: id});
    }).catch(() => {
        res.status(400).json({msg: "Failed"});
    })
});

router.post('/editapplicant', isAuth, function (req, res, next) {
    let {id, State, Notes, ITime, IDate, ATime} = req.body;
    console.log(req.body)
    Applicant.findOne({
        where: {id: id, Season: settings["CurrentSeason"].Value}
    }).then(async (app) => {
        app.State = State
        app.Notes = Notes
        await app.save()
        if (ITime) {
            app.ITime = ITime
        }
        if (IDate) {
            app.IDate = IDate
        }
        if (ATime) {
            app.ATime = ATime
        }
        await app.save()
        await UpdateState(app.id, State)
        res.send({msg: "Saved!", id, State});
        // res.render("/portal/row", {app});
    }).catch((err) => {
        console.log(err);
        res.status(400).json({msg: "Failed"});
    })
});

router.get('/applicants/incomplete', isAuth, function (req, res, next) {
    Applicant.findAll({
        where: {
            End: null,
            Season: settings["CurrentSeason"].Value
        }
    }).then(app => {
        res.render('portal/incomplete', {title: "Incomplete Applications", applicants: app});
    }).catch(() => {
        createError(404);
    })
});

router.post('/applicants/incomplete', isAuth, function (req, res, next) {
    let {
        id,
        name,
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
        second
    } = req.body;
    let team = req.body['team[]'];
    let gen = req.body['Gen[]'];
    let sit = req.body['sit[]'];
    let answers = {
        Team: team,
        General: gen,
        Situational: sit
    }
    Applicant.findOne({
        where: {
            id: id,
            Season: settings["CurrentSeason"].Value
        }
    }).then((applicant) => {
        if (!applicant) {
            return res.status(400).json({msg: "Error"});
        }
        let secs = parseInt(settings["FormTime"].Value) * 1.05;
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
    }).catch((err) => {
        console.log(err);
        return res.status(400).json({msg: "Error"});
    })

});
router.post('/sendtosheet', isAuth, function (req, res, next) {
    let {id} = req.body;
    console.log("Sheet");
    Applicant.findOne({
        where: {id: id, Season: settings["CurrentSeason"].Value}
    }).then((app) => {
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
            // Answers: app.Answers,
            // Q1: app.Answers.Team[0],
            // Q2: app.Answers.Team[1],
            // Q3: app.Answers.Team[2],
            // Q4: app.Answers.Team[3],
            // General1: app.Answers.General[0],
            // General2: app.Answers.General[1],
            // General3: app.Answers.General[2],
            // General4: app.Answers.General[3],
            // Situational1: app.Answers.Situational[0],
            // Situational2: app.Answers.Situational[1],
            // Situational3: app.Answers.Situational[2],
            End: formatToTimeZone(app.End, "ddd MMM DD YYYY HH:mm:ss [GMT]Z (z)", {timeZone: 'Africa/Cairo'}),
            Start: formatToTimeZone(app.Start, "ddd MMM DD YYYY HH:mm:ss [GMT]Z (z)", {timeZone: 'Africa/Cairo'}),
            ITime: app.ITime,
            IDate: app.IDate,
            ATime: app.ATime,
            Season: app.Season
        }
        AddToSheet(data).then(r => {
            res.status(200).json({msg: "Sent Successfully", id: app.id});
        }).catch((e) => {
            console.log(e);
            res.status(400).json({msg: "Failed"});
        });

    }).catch(() => {
        res.status(400).json({msg: "Failed"});
    })
});

router.get('/sendtosheet/:limit/:offset', isAuth, function (req, res, next) {
    let offset = parseInt(req.params.offset);
    let limit = parseInt(req.params.limit);
    Applicant.findAll({
        limit: limit,
        offset: offset,
        where: {End: {[Op.ne]: null}, Season: settings["CurrentSeason"].Value}
    })
        .then(async (apps) => {
            await apps.forEach((app) => {
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
                    // Answers: app.Answers,
                    // Q1: app.Answers.Team[0],
                    // Q2: app.Answers.Team[1],
                    // Q3: app.Answers.Team[2],
                    // Q4: app.Answers.Team[3],
                    // General1: app.Answers.General[0],
                    // General2: app.Answers.General[1],
                    // General3: app.Answers.General[2],
                    // General4: app.Answers.General[3],
                    // Situational1: app.Answers.Situational[0],
                    // Situational2: app.Answers.Situational[1],
                    // Situational3: app.Answers.Situational[2],
                    End: formatToTimeZone(app.End, "ddd MMM DD YYYY HH:mm:ss [GMT]Z (z)", {timeZone: 'Africa/Cairo'}),
                    Start: formatToTimeZone(app.Start, "ddd MMM DD YYYY HH:mm:ss [GMT]Z (z)", {timeZone: 'Africa/Cairo'}),
                    ITime: app.ITime,
                    IDate: app.IDate,
                    ATime: app.ATime,
                    Season: app.Season
                }
                AddToSheet(data)
            })
            res.status(200).json({msg: "Sent Successfully"});
        })
        .catch((e) => {
            res.status(500).json({msg: "Failed"});
        })
});

router.get('/sendalltosheet', isAuth, async function (req, res, next) {
    let {id} = req.body;
    console.log("Sheet");
    Applicant.findAll({
        where: {
            Season: settings["CurrentSeason"].Value, End: {
                [Op.ne]: null
            }
        }
    }).then(async (apps) => {
        const doc = new GoogleSpreadsheet(settings["SheetID"].Value);
        await doc.useServiceAccountAuth(creds);
        await doc.loadInfo()
        let sheet = await doc.sheetsByTitle["All"];
        let rows = []
        await apps.forEach((app) => {
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
                // Answers: app.Answers,
                // Q1: app.Answers.Team[0],
                // Q2: app.Answers.Team[1],
                // Q3: app.Answers.Team[2],
                // Q4: app.Answers.Team[3],
                // General1: app.Answers.General[0],
                // General2: app.Answers.General[1],
                // General3: app.Answers.General[2],
                // General4: app.Answers.General[3],
                // Situational1: app.Answers.Situational[0],
                // Situational2: app.Answers.Situational[1],
                // Situational3: app.Answers.Situational[2],
                End: formatToTimeZone(app.End, "ddd MMM DD YYYY HH:mm:ss [GMT]Z (z)", {timeZone: 'Africa/Cairo'}),
                Start: formatToTimeZone(app.Start, "ddd MMM DD YYYY HH:mm:ss [GMT]Z (z)", {timeZone: 'Africa/Cairo'}),
                ITime: app.ITime,
                IDate: app.IDate,
                ATime: app.ATime,
                Season: app.Season
            }
            rows.append(data)
        })
        try {
            await sheet.addRows(rows)

        } catch (e) {
            console.log(e);
        }
        res.status(200).json({msg: "Sent Successfully", id: app.id});
    }).catch(() => {
        res.status(400).json({msg: "Failed"});
    })
});

router.get('/applicants/modal', isAuth, async function (req, res, next) {
    let id = req.query.id;
    let questions = await Question.GetGroupedQuestions(settings["CurrentSeason"].Value);
    Applicant.findOne({
        where: {
            id: id,
            Season: settings["CurrentSeason"].Value
        }
    }).then(app => {
        if (app) {
            console.log("Showing #" + app.id)
            res.render('portal/infomodal', {title: "hi", app: app, questions});
        }
    }).catch(() => {
        createError(404);
    })
});

router.get('/applicants/edit', isAuth, function (req, res, next) {
    let id = req.query.id;
    Applicant.findAll({
        where: {
            id: id,
            Season: settings["CurrentSeason"].Value
        }
    }).then(app => {
        if (app) {
            res.render('portal/editmodal', {app: app[0]});
        }
    }).catch(() => {
        createError(404);
    })
});

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
    if (!(["Admin", "President", "HR VP", "TD Team Leader"].includes(req.user.Position.Name) || req.user.isAdmin)) {
        res.redirect("/portal")
    }
    let {Name, Phone, Email, Team} = req.body
    if (!Team || !Name || !Phone || !Email) {
        createError(4500)
    }
    Member.create({
        Name,
        Phone,
        Email,
        Committee: Team,
        Directorate: Directorates[Team],
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
