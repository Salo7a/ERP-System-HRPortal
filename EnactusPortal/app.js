const createError = require('http-errors');
const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
// const sassMiddleware = require('node-sass-middleware');
const db = require('./models/index');
const flash = require('express-flash');
const passport = require('passport');
const engine = require('ejs-mate');
const helmet = require('helmet');
const Config = require('./models').Config;
let passportConfig = require('./config/passport');
// initalize sequelize with session store
const SequelizeStore = require("connect-session-sequelize")(session.Store);

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const portalRouter = require('./routes/portal');
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

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser('keyboard'));
// app.use(sassMiddleware({
//     src: path.join(__dirname, 'public'),
//     dest: path.join(__dirname, 'public'),
//     indentedSyntax: false, // true = .sass and false = .scss
//     sourceMap: true
// }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/dist', express.static(path.join(__dirname, 'node_modules/admin-lte/dist')));
app.use('/plugins', express.static(path.join(__dirname, 'node_modules/admin-lte/plugins')));
app.use(helmet({
    contentSecurityPolicy: false,
}))


//Express Session
app.use(session({
    secret: "keyboard",
    cookie: {maxAge: 60000},
    store: new SequelizeStore({
        db: db.sequelize,
    }),
    resave: false,
    saveUninitialized: false
}));
// Auth Middleware
app.use(passport.initialize());
app.use(passport.session());
app.use(passport.authenticate('remember-me'));

app.use(function (req, res, next) {
    res.locals.user = req.user;
    next();
});
//Flash
app.use(flash());
app.use((req, res, next) => {
    res.locals.flashMessages = req.flash();
    next();
});
let setCache = function (req, res, next) {
    // here you can define period in second, this one is 5 minutes
    const period = 60 * 5

    // you only want to cache for GET requests
    if (req.method === 'GET') {
        res.set('Cache-control', `public, max-age=${period}`)
    } else {
        // for the other requests set strict no caching parameters
        res.set('Cache-control', `no-store`)
    }

    // remember to call next() to pass on the request
    next()
}

// now call the new middleware function in your app

app.use(setCache)
// Middleware for settings
app.use(function (req, res, next) {
    if (req.isAuthenticated()) {
        res.locals.user = req.user;
    }
    Config.findAll({raw: true}).then(async r => {
            let settings = {};
            await r.forEach(setting => {
                settings[setting.Setting] = setting;
            });
            global.settings = settings
            res.locals.settings = settings;
            next();

        }
    )
});
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/portal', portalRouter);
app.use('/admin', adminRouter);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    if (res.headersSent) {
        return next(err)
    }
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});


module.exports = app;

