const Mbot = require('mbot');
const rp = require('request-promise');
const mbot = new Mbot({name: 'mm-test-bot'});


const options = {
    uri: 'https://parseapi.back4app.com/classes/bot_suplier',
    qs: {},
    headers: {
        'User-Agent': 'Request-Promise',
        'X-Parse-Application-Id': 'kZsHl9upm1PpOICfSFJgIT4Cid4FerXZkduCIy5L',
        'X-Parse-REST-API-Key': 'VQIaHvfbIqvqKHmkvhya2OkIj3ZBGyipkm7baHP8'
    },
    json: true // Automatically parses the JSON string in the response 
};


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

// function get_suplies(callback) {
//   rp(options).then(function (response) {
//                 response.results.forEach(function(suplie,i){
//                   msg = `I got you ${suplie.title} : ${suplie.msg}` 
//                 });
//              })
//              .catch(function (err) {
//                 // API call failed... 
//              });
// }


mbot.listen({text: "start"}, (event) => {
  mbot.sendText(event.user, "starting to respond again")
  .then(() => {
    return mbot.setIgnored(event.user, false)
  })
  .then(user => {
    console.log(user);
  })
});

mbot.listen({text: "stop"}, (event) => {

  mbot.sendText(event.user, "I'll stop responding")
  .then(() => {
    return mbot.setIgnored(event.user, true, "start")
  })
});

mbot.listen({text: "give me suplies"}, (event) => {
   rp(options).then(function (response) {
                response.results.forEach(function(suplie,i){
                  msg = `I got you ${suplie.title} : ${suplie.msg}`; 
                  mbot.sendText(event.user, msg)
                  .then(()=>{
                    mbot.listen({text: "1st"}, (event) => {
                      suplie=response.results[0];
                      msg = `this ${suplie.title} : ${suplie.msg}`;
                      mbot.sendText(event.user, msg);
                    });

                  });
                });    
             })
             .catch(function (err) {
                console.log(`Mmm somethings not right:${err}`)
               });
  
});

// It is IMPORTANT than this, the default is the last listener
// mbot.listen({text: /.+/g}, (event) => {
//   mbot.sendText(event.user, event.text)
// });
