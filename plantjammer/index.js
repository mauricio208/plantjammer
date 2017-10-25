const Mbot = require('../mbot');
const rp = require('request-promise');
const schedule = require('node-schedule');
const Promise = require('bluebird');

const mbot = new Mbot({name: 'plantjammer'});



const getRandomFromArray = (array) => array[Math.floor(Math.random()*array.length)]

const recursiveSendText = (event, list, sendTemplateParams) => {
  if (list.length > 1) {
    return mbot.sendText(event.user, list[0])
      .then(() => {
        recursiveSendText(event, list.slice(1,list.length), sendTemplateParams)
      })
  }
  if (sendTemplateParams){
    return mbot.sendTemplate(event.user, ...sendTemplateParams)
  }
}

mbot.start()
.then(() => {
  mbot.setGetStarted()
  .catch(err => console.log("I failed in the get started"))
  mbot.unsetMenu()
  .then(() => {
    mbot.setMenu([
      {
        locale: "default",
        // composer_input_disabled: true,
        call_to_actions: [
          {
            type: "postback",
            title: 'Gemte boliger',
            payload: "SYNES_GODT_OM_OPTION"
          },
          {
            type: "postback",
            title: "Vis mig en bolig",
            payload: "VIS_MIG_BOLIG"
          },
          {
            title:"Flere muligheder",
            type:"nested",
            call_to_actions:[
              {
                type: "postback",
                title: "Indstillinger",
                payload: "CONFIG"
              },
              {
                type: "postback",
                title: "Om BoligBuddy",
                payload: "BUDDY_MESSAGE"
              }
            ]
          }
        ]
      }
    ])
    .catch(err => console.log("I failed setting the menu", err))
  })
});

// CONFIG
mbot.listen({
  text: /BUDDY_MESSAGE/
}, (event) => {
  return mbot.sendText(
    event.user,
    'BoligBuddy er en gratis service leveret af SundayGo'
  )
  .then(() => {
    let uspsMsg = getRandomFromArray(uspsMessages)
    let templateParams = [{
      template_type: "button",
      text: uspsMsg[uspsMsg.length-1],
      buttons: [
        {
          type: 'web_url',
          title: 'Åbn SundayGo',
          url: `https://sunday.dk/`,
        }
      ]

    }]
    return recursiveSendText(event, uspsMsg, templateParams)
  })
  
})

// GET_STARTED_PAYLOAD
mbot.listen({
  text: /START_PLATJAMMER_BOT/
}, (event) => {

  let temp;
  return mbot.getUser(event.user)
  .then(user => {
    user.custom = {};
    user.custom.customSearch = {};
    user.markModified('custom');
    return user.save();
  })
  .then(() => {
    return mbot.sendText(
      event.user,
      '',
      [
        {
          content_type: "text",
          title: "Eating plants... Why would I do such a thing?",
          payload: "EATING_PLANTS"
        },
        {
          content_type: "text",
          title: "Try Plant Jammer's cooking assistant!",
          payload: "COOKING_ASSISTANT"
        },
        {
          content_type: "text",
          title: "About Plant Jammer",
          payload: "ABOUT"
        },
      ]
    )
  })
})

//EATING_PLANTS
mbot.listen({
  text: /EATING_PLANTS/
}, (event) => {
  
  return mbot.getUser(event.user)
    .then(() => {
      return mbot.sendText(
        event.user,
        'Because it is the sustainable choice: If 1 bn people ate veggies just 1 time per week, we would save as much CO2 as converting all personal cars in the US, UK and Germany to electric!'
      )
    })
    .then(() => {
      return mbot.sendText(
        event.user,
        'Because it is easy: With veggies you can make the world sustainable from your home - no need for government regulation or large investments'
      )
    })
    .then(() => {
      return mbot.sendText(
        event.user,
        'Because they are delicious.Veggies taste amazing and are good for you - we just need to learn how to cook them',
        [
          {
            content_type: "text",
            title: "How can I feel full when not eating meat?",
            payload: "FULL_NOT_MEAT"
          },
          {
            content_type: "text",
            title: "How can I make veggies delicious?",
            payload: "MAKE_VEGGIES_DELI"
          },
          {
            content_type: "text",
            title: "Try Plant Jammer's cooking assistant!",
            payload: "COOKING_ASSISTANT"
          },
        ]
      )
    })
})

// Select city
mbot.listen({
  text: /(.+)_OPTION_CITY_FLOW/
}, (event) => {
  const city = event.text.replace('_OPTION_CITY_FLOW', '').toLowerCase();
  return mbot.getUser(event.user)
    .then(user => {
      user.custom.currentCity = city
      user.markModified('custom');
      return user.save();
    })
    .then(() => {
      return mbot.sendText(
        event.user,
        'Hvad synes du om den her bolig?'
      )
      .then(() => {
        return showCardAndUpdate(event.user, city);
      })
    })

})