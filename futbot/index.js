const Mbot = require('mbot');
const rp = require('request-promise');
const mbot = new Mbot({name: 'mm-test-bot'});

const welcome_title = "Welcome to the futbot trivia";
const welcome_subtitle = "Have fun pressing the start button";
const welcome_image_url = "";
const correct_msg = "That's correct! :)";
const incorrect_msg = "That's not the answer :(";
const out_of_time = "Ups, out of time ⏰";
const wait_time = 15;  // in seconds

function save_custom (user) {
  user.markModified('custom');
  return user.save()
}

function rand_index (arr) {
  return Math.trunc(Math.random()*arr.length);
}

function date_diff (ans_date, actual_date) {
  d1 = new Date(actual_date);
  d2 = new Date(ans_date);
  return (d1.getTime()-d2.getTime())/1000
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
        best_round: 0,
        trivia_on: false,
      }
    }
  }else{
    user.custom.futbot.questions_answered=[];
    user.custom.futbot.actual_points=0;
    user.custom.futbot.trivia_on = true;
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
  user.custom.futbot.actual_points += point;
  return save_custom(user);
}

function store_best_round(user) {
  let points = user.custom.futbot.actual_points;
  let max = user.custom.futbot.best_round;
  user.custom.futbot.best_round = points >= max ? points:max;
  user.custom.trivia_on = false;
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

function template_payload (title,subtitle,image_url,buttons) {
  return {
        "template_type":"generic",
        "elements":[
           {
            "title":title,
            "image_url":image_url,
            "subtitle":subtitle,
            "buttons": buttons      
          }
        ]
      }

    // [
    //           {
    //             "type":"web_url",
    //             "url":"https://petersfancybrownhats.com",
    //             "title":"View Website"
    //           },{
    //             "type":"postback",
    //             "title":"Start Chatting",
    //             "payload":"DEVELOPER_DEFINED_PAYLOAD"
    //           }              
    //         ]
}
      
function welcome (event) {
  welcome_button =[{
                "type":"postback",
                "title":"Start Trivia",
                "payload":"TRIVIA_START_PAYLOAD"
              }]
  payload = template_payload(welcome_title,welcome_subtitle,welcome_image_url,welcome_button)
  return mbot.sendTemplate(event.user,payload).catch (err => console.log(err));
}
    
function ask_question(event,user) {
  return rp(request_trivia(user)).then((response)=>{
    if (response.results.length === 0) {
      store_best_round(user).then(()=>{
        msg = `Score:${user.custom.futbot.actual_points}, Max Score:${user.custom.futbot.best_round}`
        mbot.sendText(event.user, msg).then(welcome(event));
      });
    }else{
      i=rand_index(response.results);
      let question = response.results[i];
      let msg=question.question;
      payload = template_payload("Question",msg,question.image.url)
      mbot.sendTemplate(event.user,payload,get_answers(question.options))
      .then(store_question_data(user,question));   
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

mbot.listen({text: "TRIVIA_START_PAYLOAD"}, (event) => {
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
    if (user.custom == null) {
      welcome(event);
    }else{
      if (user.custom.futbot.trivia_on) {
        on_time = date_diff(user.custom.futbot_anstime,Date()) < wait_time
        if (user.custom.futbot_correct_ans.includes(event.text) && on_time) {
          store_trivia_data(user,user.custom.futbot_qst,1)
            .then(
              mbot.sendText(event.user, correct_msg)
                .then(
                  ask_question(event,user)
                )
            );
          

        }else{
          msg=incorrect_msg
          if (!on_time)
            msg=out_of_time;
          store_trivia_data(user,user.custom.futbot_qst,0)
            .then(
                mbot.sendText(event.user, msg)
                  .then(
                    ask_question(event,user)
                  )
              );
        }
      }else{
         welcome(event);
      }
    }
  });
  
});