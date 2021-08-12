require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const { v4: uuidv4 } = require('uuid');

const { JSDOM } = require( "jsdom" );
const { window } = new JSDOM( "" );
const $ = require( "jquery" )( window );

const app =express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static("public"));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true})

const itemsSchema = new mongoose.Schema({
  username:String,
  paymentContext:String,
  uniqueID:String,
  amount:Number
})

const Item = mongoose.model("Item",itemsSchema);

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  pay:[itemsSchema],
  recieve:[itemsSchema],
  acceptDiscount:[itemsSchema],
  requestDiscount:[itemsSchema]
})

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/",function(req, res){
  res.sendFile(__dirname + "/index.html")
})
app.get("/Sign-in", function(req, res){
  let str = "Sign-in";
  res.render("register",{register:str})
})
app.get("/Sign-up", function(req, res){
  let str = "Sign-up";
  res.render("register",{register:str})
})
app.get("/dashboard",function(req,res){
  username = req.user.username;

  if(req.isAuthenticated()){
    User.findOne({username:req.user.username},function(err,foundList){

      res.render("dashboard", {username:username,oldListItems:foundList.pay,newListItems:foundList.recieve});

      })
  }
  else{
    res.redirect("/Sign-in");
  }
})
app.get("/Log-out",function(req, res){
  req.logout();
  res.redirect("/");
})
let user_arr = [];
app.get("/Split", function(req, res){
  res.render("split",{listItems:user_arr});
})

app.get("/discount",function(req,res){
  username = req.user.username;

  if(req.isAuthenticated()){
    User.findOne({username:req.user.username},function(err,foundList){

      res.render("discount", {username:username,oldListItems:foundList.acceptDiscount,newListItems:foundList.requestDiscount});

      })
  }
  else{
    res.redirect("/Sign-in");
  }
})

app.post("/Sign-in",function(req,res,next){

  const user = new User({
    username:req.body.username,
    password: req.body.password
  })

  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.redirect('/Sign-in'); }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.redirect("/dashboard");
    });
  })(req, res, next);

})
app.post("/Sign-up",function(req,res){
  User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect("/Sign-up")
    }
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/dashboard");
      })
    }
  })

})

app.post("/dashboard",function(req, res){
  let flag = 1;
  const id=req.user._id;
  const unique = uuidv4();
  let tempitem = new Item({
    username:req.body.username,
    paymentContext:req.body.paymentContext,
    uniqueID:unique,
    amount:req.body.amount
  })

  const store = req.body.list;
  if (store==="pay"){
    User.findOne({username:req.body.username},function(err,foundList){
      if(foundList){
        if(foundList.length != 0){
          User.findOne({_id:id},function(err, foundLis){
            tempitem = new Item({
              username:foundLis.username,
              paymentContext:req.body.paymentContext,
              uniqueID:unique,
              amount:req.body.amount
            })
            foundList.recieve.push(tempitem);
            foundList.save();
          })

        }
      }
      else{
        flag = 0;
      }
      })


        User.findOne({username:req.user.username},function(err,foundList){
          if(foundList){
            if(foundList.length != 0){
              foundList.pay.push(tempitem);
              foundList.save();
            }
          }
          res.redirect("/dashboard");
          })


  }
  else {
    User.findOne({username:req.body.username},function(err,foundList){

      if(foundList){
        if(foundList.length != 0){
          User.findOne({_id:id},function(err,foundLis){
            tempitem = new Item({
              username:foundLis.username,
              paymentContext:req.body.paymentContext,
              uniqueID:unique,
              amount:req.body.amount
            })
            foundList.pay.push(tempitem);
            foundList.save();
          })

        }
      }
      else{
        flag=0;
      }
      })

    User.findOne({_id:id},function(err,foundList){
      if(foundList){
        if(foundList.length != 0){
          foundList.recieve.push(tempitem);
          foundList.save();
        }
      }
      res.redirect("/dashboard");
      })
  }


})

app.post("/delete",function(req, res){
  const del1 = req.user.username;
  const del2 = req.body.checkbox;
  const pay ="pay";
  const recieve = "recieve";
  const count = req.body.count;
  const action = req.body.action;
  let unique = "";

if(req.body.action === recieve){
  User.findOne({username:del1},function(err,foundUser){
    if(err){
      console.log(err);
    }
    else{
      unique = foundUser.recieve[count].uniqueID;

      foundUser.recieve.splice(count,1);
      foundUser.save();
    }
  })
  User.findOne({username:del2},function(err,foundUser){
    if (foundUser){
      if(err){
        console.log(err);
      }
      else{
        let i = -1;
        for(i = 0;i<foundUser.pay.length;i++){
          if(foundUser.pay[i].uniqueID === unique){
            break;
          }
        }

        if(i != -1){
          foundUser.pay.splice(i,1);
          foundUser.save();
        }
      }
    }
  })
}
else{
  User.findOne({username:del1},function(err,foundUser){
    if(err){
      console.log(err);
    }
    else{
      unique = foundUser.pay[count].uniqueID;
      foundUser.pay.splice(count,1);
      foundUser.save();
    }
  })
  User.findOne({username:del2},function(err,foundUser){
    if(foundUser){
      if(err){
        console.log(err);
      }
      else{
        let i = -1;
        for(i = 0;i<foundUser.recieve.length;i++){
          if(foundUser.recieve[i].uniqueID === unique){
            break;
          }
        }
        if(i != -1){
          foundUser.recieve.splice(i,1);
          foundUser.save();
        }
      }
    }

  })
}

  res.redirect("/dashboard");
})

app.post("/Split", function(req, res){
  const member = req.body.username;
  user_arr.push(member);
  res.redirect("/Split")
})

app.post("/Submit", function(req, res){
  const username = req.body.username;
  const size = req.body.size;
  const paymentContext = req.body.paymentContext;
  const amount = Math.floor((req.body.amount)/size);

  user_arr.forEach(function(user){
    let tempitem = new Item({
      username:username,
      paymentContext:paymentContext,
      amount:amount
    })

    User.findOne({username:user},function(err, foundUser){
      if (foundUser){
        foundUser.pay.push(tempitem);
        foundUser.save();
      }


    })
    User.findOne({username:username},function(err, foundUser){
      if(foundUser){
        tempitem = new Item({
          username:user,
          paymentContext:paymentContext,
          amount:amount
        })
        foundUser.recieve.push(tempitem);
        foundUser.save();
      }

    })


  })
  user_arr.length=0;
  res.redirect("dashboard");
})


app.post("/discount",function(req, res){
  let flag = 1;
  const id=req.user._id;
  const unique = uuidv4();
  let isTrasactionPresent = 0;
  const store = req.body.list;

  if (store==="request"){
    User.findOne({username:req.body.username},function(err,foundList){

      if(foundList){

        if(foundList.length != 0){

          User.findOne({_id:id},function(err, foundLis){

            for(let i = 0;i<foundList.recieve.length;i++){

              if(foundList.recieve[i].paymentContext === req.body.paymentContext){
                isTrasactionPresent = 1;
                break;
              }
            }

            if(isTrasactionPresent === 1){
              tempitem = new Item({
                username:foundLis.username,
                paymentContext:req.body.paymentContext,
                uniqueID:unique,
                amount:req.body.amount
              })
              foundList.acceptDiscount.push(tempitem);
              foundList.save();

              User.findOne({username:req.user.username},function(err,foundList){
                if(foundList){

                  if(foundList.length != 0){

                    tempitem.username = req.body.username;
                    foundList.requestDiscount.push(tempitem);
                    foundList.save();
                  }
                }

                })
            }

          })

        }
      }

      })

    res.redirect("/discount");
  }
})

app.post("/modify",function(req, res){
  let s = req.body.list;
  const del1 = req.user.username;
  const count = req.body.count;
  let unique = "";
  let flag = 0;
  if(s[0]==='1') flag = 1;
  const del2 = s.substring(1);
  let pc = "";

  User.findOne({username:del1},function(err,foundUser){
    if(err){
      console.log(err);
    }
    else{
      unique = foundUser.acceptDiscount[count].uniqueID;
      pc = foundUser.acceptDiscount[count].paymentContext;
      foundUser.acceptDiscount.splice(count,1);

      if(flag === 1){
        let i = -1;
        for(i = 0;i<foundUser.recieve.length;i++){
          if(foundUser.recieve[i].paymentContext === pc){
            break;
          }
        }

        if(i != -1){
          foundUser.recieve.splice(i,1);
          foundUser.update();
        }
      }

      foundUser.save();
    }
  })
  User.findOne({username:del2},function(err,foundUser){
    if (foundUser){

      if(err){
        console.log(err);
      }
      else{
        let i = -1;

        for(i = 0;i<foundUser.requestDiscount.length;i++){

          if(foundUser.requestDiscount[i].uniqueID === unique){
            break;
          }
        }

        if(i != -1){
          foundUser.requestDiscount.splice(i,1);
        }

        if(flag === 1){
          let j = -1;
          for(j = 0;j<foundUser.pay.length;j++){
            if(foundUser.pay[j].paymentContext === pc){
              break;
            }
          }

          if(j != -1){
            foundUser.pay.splice(i,1);
            foundUser.update();
          }
        }

        foundUser.save();
      }
    }
  })

  res.redirect("/discount");
})





app.listen(3000, function() {
  console.log("Server started on port 3000");
});
