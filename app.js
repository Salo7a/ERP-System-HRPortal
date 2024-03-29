const createError = require('http-errors');
const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const db = require('./models/index');
const flash = require('express-flash');
const passport = require('passport');
const engine = require('ejs-mate');
const helmet = require('helmet');
const Config = require('./models').Config;
const winston = require('./config/winston');
let passportConfig = require('./config/passport');
const {syncSettings} = require('./utils/helpers')

// initialize sequelize with session store
const SequelizeStore = require("connect-session-sequelize")(session.Store);

// Debugging
const requestIp = require('request-ip');
const useragent = require('express-useragent');

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const portalRouter = require('./routes/portal');
const recruitmentRouter = require('./routes/recruitment');
const adminRouter = require('./routes/admin');

const app = express();

//Database Connection Test
db.sequelize
    .authenticate()
    .then(() => console.log('DB Connection Successful'))
    .catch(err => console.log('Error: ' + err));

// view engine setup
app.engine('ejs', engine);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser('keyboard'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/dist', express.static(path.join(__dirname, 'node_modules/admin-lte/dist')));
app.use('/plugins', express.static(path.join(__dirname, 'node_modules/admin-lte/plugins')));
app.use(helmet({
    contentSecurityPolicy: false,
}))

app.use(requestIp.mw());
app.use(useragent.express());

const sessionStore = new SequelizeStore({
    db: db.sequelize,
});

//Express Session
app.use(session({
    secret: "keyboard",
    cookie: {maxAge: 60000},
    store: sessionStore,
    resave: false,
    saveUninitialized: false
}));

// Auth Middleware
app.use(passport.initialize());
app.use(passport.session());
app.use(passport.authenticate('remember-me'));

//Flash
app.use(flash());
app.use((req, res, next) => {
    res.locals.flashMessages = req.flash();
    next();
});
// let setCache = function (req, res, next) {
//     // here you can define period in second, this one is 5 minutes
//     const period = 60 * 5
//
//     // you only want to cache for GET requests
//     if (req.method === 'GET') {
//         res.set('Cache-control', `public, max-age=${period}`)
//     } else {
//         // for the other requests set strict no caching parameters
//         res.set('Cache-control', `no-store`)
//     }
//
//     // remember to call next() to pass on the request
//     next()
// }
//
// // now call the new middleware function in your app
//
// app.use(setCache)

// Middleware for settings
app.use(async function (req, res, next) {
    if (req.isAuthenticated()) {
        res.locals.user = req.user;
    }
    await syncSettings();
    res.locals.settings = global.settings;
    next();
});

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/portal', portalRouter);
app.use('/portal', recruitmentRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

global.winston = winston
// error handler
app.use(function (err, req, res, next) {
    if (res.headersSent) {
        return next(err)
    }
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // Winston logging
    winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});


module.exports = app;

