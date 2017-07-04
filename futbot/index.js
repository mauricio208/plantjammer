const Mbot = require('mbot');
const rp = require('request-promise');
const mbot = new Mbot({name: 'mm-test-bot'});


function save_custom (user) {
  user.markModified('custom');
  return user.save()
}

function rand_index (arr) {
  return Math.trunc(Math.random()*arr.length);
}

function get_answers(ans) {
  let answers = [];
  ans.forEach((a,i)=>{
    answers.push(
    {content_type: "text",
     title: a,
     payload: a}
    );
  });
  return answers;
}

function init_trivia_data (user) {
  if (user.custom === undefined) {
    user.custom={
        futbot: {
        questions_answered:[],
        actual_points: 0,
        best_round: 0
      }
    }
  }else{
    user.custom.futbot.questions_answered=[];
    user.custom.futbot.actual_points=0;
  }
  return save_custom(user);
}

function store_trivia_data (user, question_id,point) {
  if (user.custom === undefined) {
    user.custom={
        futbot:{
        questions_answered:[],
        actual_points: 0,
        best_round: 0
      }
    }
    save_custom(user); 
  }
  user.custom.futbot.questions_answered.push(question_id);
  user.custom.futb
  ot.actual_points += point;
  return save_custom(user);
}

function store_best_round(user) {
  let points = user.custom.futbot.actual_points;
  let max = user.custom.futbot.best_round;
  user.custom.futbot.best_round = points >= max ? points:max;
  return save_custom(user);
}

function request_trivia(user) {
  let options = {
    uri: 'https://parseapi.back4app.com/classes/QandAs',
    qs: {},
    headers: {
        'User-Agent': 'Request-Promise',
        'X-Parse-Application-Id': '9s5UU3DLIpN9OOipFmPHUNt0628JQfxtaT5jSu0P',
        'X-Parse-REST-API-Key': 'WAUiyA02cYY7c8PqNxlvhVM7TJYTjf3Td297p8qO'
    },
    json: true // Automatically parses the JSON string in the response 
  };

  let q=user.custom.futbot.questions_answered;
  let query=JSON.stringify({objectId:{$nin:q}})
  options.qs={where:query}
  return options;
}

function store_question_data(user,question) {
  user.custom.futbot_anstime= Date();
  user.custom.futbot_correct_ans= question.correct_answer;
  user.custom.futbot_qst=question.objectId; 
  return save_custom(user);
}

function ask_question(event,user) {
  return rp(request_trivia(user)).then((response)=>{
    if (response.results.length === 0) {
      store_best_round(user).then(()=>{
        msg = `Score:${user.custom.futbot.actual_points}, Max Score:${user.custom.futbot.best_round}`
        mbot.sendText(event.user,msg);
      });
    }else{
      i=rand_index(response.results);
      let question = response.results[i];
      msg=question.question;
      store_question_data(user,question).then(
        // mbot.sendImage(event.user,question.image)

        mbot.sendText(event.user,msg,get_answers(question.options))
       );   
    }
  });
}

mbot.start()
.then(() => {
  console.log(mbot);
  mbot.setGetStarted()
  .catch(err => console.log("I failed in the get started"))
  mbot.setMenu([
    {
      locale: "default",
      call_to_actions: [
        {
          type: "postback",
          title:"Help",
          payload:"DEVELOPER_DEFINED_PAYLOAD_FOR_HELP"
        },
        {
          type: "postback",
          title: "Start a New Order",
          payload: "DEVELOPER_DEFINED_PAYLOAD_FOR_START_ORDER"
        },
      ]
    }
  ])
  .catch(err => console.log("I failed setting the menu"))
})

mbot.listen({text: "t"}, (event) => {
  return mbot.getUser(event.user)
    .then(user => {
      mbot.sendText(event.user, "Trivia begins")
      .then(()=>{
        return init_trivia_data(user)
          .then(user =>{
             ask_question(event,user);
          })  
        });
      return user
    })
    .then(user => {
      console.log(user);
    })
  });

mbot.listen({text: /.+/g}, (event) => {
  return mbot.getUser(event.user)
  .then(user=>{
    if (user.custom.futbot_correct_ans.includes(event.text)) {
      store_trivia_data(user,user.custom.futbot_qst,1)
      console.log(user.custom.futbot.questions_answered);
      mbot.sendText(event.user, "correct")
      .then(
          ask_question(event,user)
        );

    }else{
      store_trivia_data(user,user.custom.futbot_qst,0);
      console.log(user.custom.futbot.questions_answered);
      mbot.sendText(event.user, "not correct")
        .then(
          ask_question(event,user)
        );
    }
  });
  
  
});


// mbot.listen({text: "stop"}, (event) => {

//   mbot.sendText(event.user, "I'll stop responding")
//   .then(() => {
//     return mbot.setIgnored(event.user, true, "start")
//   })
// });

// mbot.listen({text: "give me suplies"}, (event) => {
//    rp(options).then(function (response) {
//                 response.results.forEach(function(suplie,i){
//                   msg = `I got you ${suplie.title} : ${suplie.msg}`; 
//                   mbot.sendText(event.user, msg)
//                   .then(()=>{
//                     mbot.listen({text: "1st"}, (event) => {
//                       suplie=response.results[0];
//                       msg = `this ${suplie.title} : ${suplie.msg}`;
//                       mbot.sendText(event.user, msg);
//                     });

//                   });
//                 });    
//              })
//              .catch(function (err) {
//                 console.log(`Mmm somethings not right:${err}`)
//                });
  
// });

// It is IMPORTANT than this, the default is the last listener
// mbot.listen({text: /.+/g}, (event) => {
//   mbot.sendText(event.user, event.text)
// });
