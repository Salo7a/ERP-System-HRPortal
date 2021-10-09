const createError = require("http-errors");

module.exports = {
    isAuth: function (req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash('error', 'You need to be logged in!');
        res.redirect('/auth/login');
    },
    NotAuth: function (req, res, next) {
        if (!req.isAuthenticated()) {
            return next();
        }
        res.redirect('/portal');
    },
    isAdmin: function (req, res, next) {
        if (req.isAuthenticated()) {
            if (req.user.isAdmin) {
                return next();
            }
            req.flash('error', 'You\'re not allowed to access this page');
            res.redirect('/auth/login');
        }
        req.flash('error', 'You need to be logged in!');
        res.redirect('/auth/login');
    },
    isPos: function (Positions, req, res, next) {
        Positions.concat(["Admin", "President"])
        if(!(Positions.includes(req.user.Position.Name) || req.user.isAdmin)) {
            req.flash('error', 'Unauthorized');
            next(createError(403))
        } else {
            next()
        }

    },
    imageFilter: function (req, file, cb) {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
            req.fileValidationError = 'Only image files are allowed!';
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
};

