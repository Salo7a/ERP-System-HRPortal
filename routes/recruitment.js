let express = require('express');
const createError = require("http-errors");
let router = express.Router();
const {isAuth} = require('../utils/filters');
const {Applicant, Question} = require("../models");
const {Op} = require("sequelize");
const {GoogleSpreadsheet} = require('google-spreadsheet'),
    {promisify} = require('util'),
    creds = require('../config/Enactus21-d39432b22314.json');

const {formatToTimeZone} = require("date-fns-timezone");


async function AddToSheet(row) {
    winston.warn("Adding to sheet #" + row.ID)
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
    try {
        await sheet.addRow(row)
        await FuncSheet.addRow(row);
        await FuncSheet2.addRow(row);
        return true;
    } catch (e) {
        winston.warn("Failed to add row #" + row.ID)
        console.log(e);
        return false;
    }
}

async function SearchInSheet(sheet, id) {
    let start = 0, end = sheet.length - 1, index = null

    // Iterate while start not meets end
    while (start <= end) {

        // Find the mid index
        let mid = Math.floor((start + end) / 2);

        // If element is present at mid, return True
        if (parseInt(sheet[mid].ID) === id) {
            index = mid
            return index
        }

        // Else look in left or right half accordingly
        else if (parseInt(sheet[mid].ID) < id)
            start = mid + 1;
        else
            end = mid - 1;
    }
    if (index == null) {
        for (let i = 0; i < sheet.length - 1; i++) {
            if (parseInt(sheet[i].ID) === id) {
                index = i
                return index
            }
        }
    }
    return index
}

async function UpdateState(id, state, first, second) {
    const doc = new GoogleSpreadsheet(settings["SheetID"].Value);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo()
    let sheet = await doc.sheetsByTitle["All"];
    let AllRows = await sheet.getRows();
    let FuncSheet = await doc.sheetsByTitle[first];
    let FirstRows = await FuncSheet.getRows();
    let FuncSheet2 = await doc.sheetsByTitle[second];
    let SecondRows = await FuncSheet2.getRows();
    let index = null, index1 = null, index2 = null;
    index = await SearchInSheet(AllRows, id)
    index1 = await SearchInSheet(FirstRows, id)
    index2 = await SearchInSheet(SecondRows, id)

    if (index != null) {
        try {
            AllRows[index].State = state;
            await AllRows[index].save();
        } catch (e) {
            console.log(e);
            winston.warn("Failed to update row #" + id)
            return false;
        }
    } else {
        winston.warn("Failed to update row, ID Not Found: " + id)
        let app = await Applicant.findOne({where: {id: id}})
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
        return false;
    }
    if (index1 != null) {
        try {
            FirstRows[index1].State = state;
            await FirstRows[index1].save();
        } catch (e) {
            console.log(e);
            winston.warn("Failed to update row #" + id)
            return false;
        }
    }
    if (index2 != null) {
        try {
            SecondRows[index2].State = state;
            await SecondRows[index2].save();
            return true;
        } catch (e) {
            console.log(e);
            winston.warn("Failed to update row #" + id)
            return false;
        }
    }

}


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
    if ((["Admin", "President", "Marketing VP", "Projects VP", "Financial VP", "Multimedia VP", "HR VP"].includes(req.user.Position.Name) || req.user.isAdmin)) {
        res.redirect("/portal/applicants/all")
    }
    let Position = req.user.Position;
    let rank = await Position.getRank();
    if (rank.Level < 2) {
        next(createError(403));
    }
    let team = await Position.getTeam();
    let state = ["Accepted", "Filtered", "Rejected"];

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
        await UpdateState(app.id, State, app.First, app.Second)
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

router.get('/sendmissing', isAuth, async function (req, res, next) {
    let apps = await Applicant.findAll({
        where: {
            State: {
                [Op.ne]: null
            },
            Season: settings["CurrentSeason"].Value
        }
    })
    const doc = new GoogleSpreadsheet(settings["SheetID"].Value);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo()
    let sheet = await doc.sheetsByTitle["All"];
    let rows = await sheet.getRows()
    for (let app in apps) {
        if (await SearchInSheet(rows, apps[app].id) == null) {
            let data = {
                ID: apps[app].id,
                Name: apps[app].Name,
                Age: apps[app].Age,
                Phone: apps[app].Phone,
                Email: apps[app].Email,
                CUStudent: apps[app].CUStudent,
                State: apps[app].State,
                Time: apps[app].Time,
                Faculty: apps[app].Faculty,
                Academic: apps[app].Academic,
                Major: apps[app].Major,
                Minor: apps[app].Minor,
                English: apps[app].English,
                Excur: apps[app].Excur,
                Courses: apps[app].Courses,
                First: apps[app].First,
                Second: apps[app].Second,
                End: formatToTimeZone(apps[app].End, "ddd MMM DD YYYY HH:mm:ss [GMT]Z (z)", {timeZone: 'Africa/Cairo'}),
                Start: formatToTimeZone(apps[app].Start, "ddd MMM DD YYYY HH:mm:ss [GMT]Z (z)", {timeZone: 'Africa/Cairo'}),
                ITime: apps[app].ITime,
                IDate: apps[app].IDate,
                ATime: apps[app].ATime,
                Season: apps[app].Season
            }
            winston.warn("#" + apps[app].id + " Missing In Sheet, Sending")
            await AddToSheet(data)
        }
    }
    res.send({msg: "Done"})
});

router.get('/sendmissingstates', isAuth, async function (req, res, next) {
    let apps = await Applicant.findAll({
        where: {
            State: {
                [Op.ne]: null
            },
            Season: settings["CurrentSeason"].Value
        }
    })
    const doc = new GoogleSpreadsheet(settings["SheetID"].Value);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo()
    let sheet = await doc.sheetsByTitle["All"];
    let rows = await sheet.getRows()
    let id = null
    for (let app in apps) {
        id = await SearchInSheet(rows, apps[app].id)
        if (id != null) {
            if (rows[id].State === "Applied" && apps[app].State !== "Applied") {
                rows[id].State = apps[app].State

            }
            winston.warn("#" + apps[app].id + " Wrong State, Sending")
            await AddToSheet(data)
        }
    }
    res.send({msg: "Done"})
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
    let season = settings["CurrentSeason"].Value
    let questions = await Question.GetGroupedQuestions(season);
    while (!questions || !questions.General || !questions.Situational) {
        season -= 1
        if (season < 2022) {
            next(createError(454))
        }
        questions = await Question.GetGroupedQuestions(season)
    }
    Applicant.findOne({
        where: {
            id: id
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

router.get('/applicants/profile/:id', isAuth, async function (req, res, next) {
    let id = req.params.id;
    let season = settings["CurrentSeason"].Value
    let questions = await Question.GetGroupedQuestions(season);
    while (!questions || !questions.General || !questions.Situational) {
        season -= 1
        if (season < 2022) {
            next(createError(454))
        }
        questions = await Question.GetGroupedQuestions(season)
    }
    Applicant.findOne({
        where: {
            id: id,
            Season: season
        }
    }).then(app => {
        if (app) {
            res.render('portal/applicantprofile', {title: `${app.Name}'s Profile`, app: app, questions});
        } else {
            next(createError(404));
        }
    }).catch(() => {
        createError(404);
    })
});

module.exports = router;