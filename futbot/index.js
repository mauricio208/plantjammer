const Mbot = require('mbot');
const rp = require('request-promise');
const mbot = new Mbot({name: 'mm-test-bot'});
const Puid = require('puid');

/*Welcome template text*/
const welcome_title = "Velkommen til Byens Hold Trivia, Tryk for at spille med";
const welcome_subtitle = "Kender du dit Byens Hold? Få din highscore og udfordr dine venner! Pøj Pøj!";
const welcome_image_url = "";

/*Correct answer message*/
const correct_msg = `🎉 🎉 🎉\n\nRigtigt svar 💪 💪 💪\n\nEr du klar til næste spørgsmål?`;

/*Incorrect answer message*/
const incorrect_msg = (correct_ans)=>{ return `😿 😿 😿\n\nDet rigtige svar er ${correct_ans} 😶 😶 😶`}

/*Time limit data*/
const out_of_time = "Ups, out of time ⏰";
const wait_time = 9;  // in seconds

/*Rules data*/
const rules_text_button = "Hvad går det ud på?";
const rules = `Det er ret simpelt:\n\nDu har 7 sekunder til at svare rigtigt på spørgsmål hvor du får 3 svarmuligheder.\n\nSvarer du rigtigt får du endnu et spørgsmål 👍 Svarer du forkert skal du starte forfra 👎\n\nDin bedste winning streak kommer på highscoren og du kan udfordre dine venner og andet sjovt 🙌\n\nEr du klar på at spille med?`

const sett = (resolve, t) => {
  setTimeout(resolve, t)
}

function delay(t) {
  return new Promise((resolve) => {
    sett(resolve, t)
  });
}

function date_diff (ans_date, actual_date) {
  d1 = new Date(actual_date);
  d2 = new Date(ans_date);
  return (d1.getTime()-d2.getTime())/1000
}


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
          best_round: 0,
          trivia_on: false,
      }
    }
  }else{
    user.custom.futbot.questions_answered=[];
    user.custom.futbot.actual_points=0;
    user.custom.futbot.trivia_on = true;
    user.custom.futbot.out_of_time = false;
    user.custom.futbot_qanswered = false;
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
  user.custom.futbot_qanswered = true;

  return save_custom(user);
}

function store_best_round(user) {
  let points = user.custom.futbot.actual_points;
  let max = user.custom.futbot.best_round;
  user.custom.futbot.best_round = points >= max ? points:max;
  user.custom.futbot.trivia_on = false;
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

function store_question_data(user,question,question_puid) {
  user.custom.futbot_correct_ans = question.correct_answer;
  user.custom.futbot_qst = question.objectId;
  user.custom.futbot_qst_puid = question_puid
  user.custom.futbot_qanswered = false ;
  return save_custom(user);
}

function template_payload(title,subtitle,image_url,buttons) {
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
}
function coorect_answer (event) {
  ask_button =[{
                content_type:"text",
                title:"Yessir!",
                payload:"ASK_QST_PAYLOAD"
              }]
  return mbot.sendText(event.user, correct_msg,ask_button);
}
function score(event, actual_points, best_round) {
  msg = `Score:${actual_points}, High score:${best_round}`
  try_again_button =[{
                "type":"postback",
                "title":"Spil igen",
                "payload":"TRIVIA_WELCOME_PAYLOAD"
              }]
  payload = template_payload(msg,"Try again!",null,try_again_button)
  return mbot.sendTemplate(event.user, payload)
}

function welcome (event) {
  welcome_button =[{
                "type":"postback",
                "title":"Spil med nu",
                "payload":"TRIVIA_START_PAYLOAD"
              }]
  rules_qa = [{content_type: "text",
               title: rules_text_button,
               payload: 'RULES_PAYLOAD'}]
  payload = template_payload(welcome_title,welcome_subtitle,welcome_image_url,welcome_button)
  return mbot.sendTemplate(event.user,payload,rules_qa).catch (err => console.log(err));
}
    
function ask_question(event,user) {
  return rp(request_trivia(user)).then((response)=>{
    if (response.results.length === 0) {
      return store_best_round(user)
        .then(user=>{
          return score(event, user.custom.futbot.actual_points, user.custom.futbot.best_round)
        })
        .then(()=>Promise.resolve());
    }else{
      i=rand_index(response.results);
      let question = response.results[i];
      let msg=question.question;
      payload = template_payload(msg,"",question.image.url)
      let puid = new Puid();
      let question_puid = puid.generate()
      return store_question_data(user,question, question_puid)
        .then(user=>mbot.sendTemplate(event.user,payload,get_answers(question.options)))
        .then(()=>timer(event,question_puid));  
    }
  });
}

function timer(event,question_id) {
  return delay(wait_time*1000)
        .then(()=> mbot.getUser(event.user))
        .then(user=>{
          if (!user.custom.futbot.out_of_time) {
            if (!user.custom.futbot_qanswered && user.custom.futbot_qst_puid==question_id) {

              user.custom.futbot.trivia_on = false;
              user.custom.futbot.out_of_time = true;
              return save_custom(user)
                .then(()=>mbot.sendText(event.user, out_of_time))
                .then(()=>{
                  return score(event, user.custom.futbot.actual_points, user.custom.futbot.best_round)

                  })
                .then(()=> Promise.resolve());

            }
          }
          return Promise.resolve();
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

mbot.listen({text: "GET_STARTED_PAYLOAD"}, (event) => {
  return welcome(event)
              .then(()=> Promise.resolve());
});

mbot.listen({text: "RULES_PAYLOAD"}, (event) => {
  welcome_button =[{
                content_type:"text",
                title:"Spil med nu",
                payload:"TRIVIA_START_PAYLOAD"
              }]
  return mbot.sendText(event.user, rules,welcome_button);
});

mbot.listen({text: "TRIVIA_START_PAYLOAD"}, (event) => {
  return mbot.getUser(event.user)
    .then(user => {
      if (user.custom == null) {
         return init_trivia_data(user)
                .then(user => ask_question(event,user))
      }

      if (user.custom.futbot == null){
        return init_trivia_data(user)
              .then(user => ask_question(event,user))
      }

      if (!user.custom.futbot.trivia_on) {
        return init_trivia_data(user)
              .then(user => ask_question(event,user))
      }
      
    });
  });

mbot.listen({text: "ASK_QST_PAYLOAD"}, (event) => {
  return mbot.getUser(event.user)
        .then(user=>ask_question(event, user));
});

mbot.listen({text: /.+/g}, (event) => {
  return mbot.getUser(event.user)
  .then(user=>{
    if (user.custom == null) {
      welcome(event);
    }else{
      if (user.custom.futbot.trivia_on) {
        if (user.custom.futbot_correct_ans.includes(event.text)) {

          return store_trivia_data(user,user.custom.futbot_qst,1)
            .then(()=> coorect_answer(event))
        }else{
          user.custom.futbot.trivia_on=false
          user.custom.futbot_qanswered = true;
          msg=incorrect_msg(user.custom.futbot_correct_ans[0]);
          return save_custom(user)
                  .then(user=>{
                    return store_best_round(user)
                  })
                  .then(()=> mbot.sendText(event.user, msg))
                  .then(()=>{
                    return score(event, user.custom.futbot.actual_points, user.custom.futbot.best_round)

                  })
                  // .then(() => mbot.getUser(event.user))
                  // .then(user => {
                  //   if (!user.custom.futbot.out_of_time){
                  //     return welcome(event)
                  //   }
                  //   return Promise.resolve();
                  // });
        }
      }else{
        if (!user.custom.futbot.out_of_time) {
          return welcome(event);
        }
        return Promise.resolve();
      }
    }
  });
  
});
