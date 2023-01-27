const passport = require('passport');
const bcrypt = require('bcrypt');

module.exports = function(app, myDataBase) {
  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/');
  }
  
  app.route('/login').post( passport.authenticate('local', {failureRedirect: '/'}), (req, res) => {
    res.redirect('/chat');
  });

  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    res.render(process.cwd() + '/views/pug/profile', {username: req.user.username});
  });

  app.route('/auth/github')
    .get(passport.authenticate('github'), (req, res) => {
      res.redirect('/profile');
    })

  app.route('/auth/github/callback')
    .get(
      passport.authenticate('github', {failureRedirect: '/'}), (req, res) => {
        req.session.user_id = req.user.id
        res.redirect('/chat');
      }
    );

  app.route('/').get((req, res) => {
    res.render('pug', {
      title: 'Connected to Database', 
      message: 'Please login',
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true
    });
  });

  app.route('/logout')
    .get((req, res) => {
      req.logout();
      res.redirect('/');
    });
  
  app.route('/register')
    .post((req, res, next) => {
      myDataBase.findOne({ username: req.body.username}, function(err, user) {
        if (err) {
          next(err);
        } else if (user) {
          res.redirect('/');
        } else {
          const hash = bcrypt.hashSync(req.body.password, 12);
          myDataBase.insertOne({
            username: req.body.username,
            password: hash
          }, (err, doc) => {
            if (err) {
              res.redirect('/');
            } else {
              // The inserted doc is held 
              // within the ops prop of the doc
              next(null, doc.ops[0]);
            }
          })
        }
      })
    }, passport.authenticate('local', { failureRedirect: '/'}), (req, res, next) => {
      res.redirect('/profile');
    });
  app.route('/chat')
    .get(ensureAuthenticated, (req, res) => {
      res.render(process.cwd() + '/views/pug/chat');
    });
}