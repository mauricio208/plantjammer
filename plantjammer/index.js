const Mbot = require('../mbot');
const rp = require('request-promise');
// const schedule = require('node-schedule');
const Promise = require('bluebird');

const mbot = new Mbot({ name: 'plantjammer' });



const getRandomFromArray = (array) => array[Math.floor(Math.random() * array.length)]

const recursiveSendText = (event, list, sendTemplateParams) => {
  if (list.length > 1) {
    return mbot.sendText(event.user, list[0])
      .then(() => {
        recursiveSendText(event, list.slice(1, list.length), sendTemplateParams)
      })
  }
  if (sendTemplateParams) {
    return mbot.sendTemplate(event.user, ...sendTemplateParams)
  }
}

mbot.start() // This step actually searchs the bot with that name in DB and get the Facebook Access token for freely using the API
  .then(() => {
    mbot.setGetStarted() // This just set the GET_STARTED button
      .catch(err => console.log("I failed in the get started"))
    mbot.setMenu([ // This sets the persistent menu, for more info look at the Facebook docs
      {
        locale: "default",
        call_to_actions: [
          {
            type: "postback",
            title: "From the begining",
            payload: "START_PLATJAMMER_BOT"
          },
        ]
      },
    ])
      .catch(err => console.log("I failed setting the menu"))
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
        `Welcome to plantjammer\n
          1. Eating plants... Why would I do such a thing?\n
          2. Try Plant Jammer's cooking assistant!\n
          3. About Plant Jammer
        `,
        [
          {
            content_type: "text",
            title: "1",
            payload: "EATING_PLANTS"
          },
          {
            content_type: "text",
            title: "2",
            payload: "COOKING_ASSISTANT"
          },
          {
            content_type: "text",
            title: "3",
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

  let temp;
  return mbot.getUser(event.user)
    .then(() => {
      return mbot.sendText(
        event.user,
        `
          A) Why eat plants?
          B) How can I feel full when not eating meat?
          C) How can I make veggies delicious?
        `,
        [
          {
            content_type: "text",
            title: "A",
            payload: "WHY_PLANTS"
          },
          {
            content_type: "text",
            title: "B",
            payload: "FULL_NOT_MEAT"
          },
          {
            content_type: "text",
            title: "C",
            payload: "VEG_DELI"
          },
        ]
      )
    })
})


//WHY_PLANTS __EATING_PLANTS
mbot.listen({
  text: /WHY_PLANTS/
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
        'Because they are delicious.Veggies taste amazing and are good for you - we just need to learn how to cook them'
      )
    })
    .then(() => {
      return mbot.sendText(
        event.user,
        `
          B) How can I feel full when not eating meat?\n
          C) How can I make veggies delicious?\n
          2. Try Plant Jammer's cooking assistant!
        `,
        [
          {
            content_type: "text",
            title: "B",
            payload: "FULL_NOT_MEAT"
          },
          {
            content_type: "text",
            title: "C",
            payload: "VEG_DELI"
          },
          {
            content_type: "text",
            title: "2",
            payload: "COOKING_ASSISTANT"
          },
        ]
      )
    })
})


//FULL_NOT_MEAT __WHY_PLANTS __EATING_PLANTS
mbot.listen({
  text: /FULL_NOT_MEAT/
}, (event) => {

  return mbot.getUser(event.user)
    .then(() => {
      return mbot.sendText(
        event.user,
        `To make you full (on plants) you need either healthy plant proteins, healthy plant fibres, or a healthy dose of that 'meaty taste' called Umami`
      )
    })
    .then(() => {
      return mbot.sendText(
        event.user,
        `
          1) What is umami?\n
          2) Give me a plant protein\n
          3) Give me a plant fibre\n
        `,
        [
          {
            content_type: "text",
            title: "1",
            payload: "W_UNAMI"
          },
          {
            content_type: "text",
            title: "2",
            payload: "PLANT_PROTEIN"
          },
          {
            content_type: "text",
            title: "3",
            payload: "PLANT_FIBRE"
          },
        ]
      )
    })
})

//W_UNAMI __FULL_NOT_MEAT __WHY_PLANTS __EATING_PLANTS
mbot.listen({
  text: /W_UNAMI/
}, (event) => {

  return mbot.getUser(event.user)
    .then(() => {
      return mbot.sendText(
        event.user,
        `The 5th basic taste (along with salty, sweet, sour, and bitter). Often described as 'meaty'. Treat it like salt - it gives anything more flavor`
      )
    })
    .then(() => {
      return mbot.sendTemplate(
        event.user,
        {
          template_type: "button",
          text: 'Want to cook with Umami? Choose one and see what it goes with: White mushrooms, Tomatoes, miso, soy sauce, parmesan',
          buttons: [
            {
              type: 'web_url',
              title: 'plantjammer.com',
              url: 'https://www.app.plantjammer.com/myfridge',
            }
          ]

        }
      )
    })
})


//PLANT_PROTEIN __FULL_NOT_MEAT __WHY_PLANTS __EATING_PLANTS
mbot.listen({
  text: /PLANT_PROTEIN/
}, (event) => {

  return mbot.getUser(event.user)
    .then(() => {
      return mbot.sendText(
        event.user,
        `You don't need meat for protein. There is plenty of protein in these plants:`
      )
    })
    .then(() => {
      return mbot.sendTemplate(
        event.user,
        {
          template_type: "button",
          text: 'Quinoa, Chickpeas, Lentils, Edamame beans, Black beans',
          buttons: [
            {
              type: 'web_url',
              title: 'plantjammer.com',
              url: 'https://www.app.plantjammer.com/myfridge',
            }
          ]

        }
      )
    })
})

//PLANT_FIBRE __FULL_NOT_MEAT __WHY_PLANTS __EATING_PLANTS
mbot.listen({
  text: /PLANT_FIBRE/
}, (event) => {

  return mbot.getUser(event.user)
    .then(() => {
      return mbot.sendText(
        event.user,
        `Fibres do wonders to your gut health. Eat them plentiful! Here are some sources:`
      )
    })
    .then(() => {
      return mbot.sendTemplate(
        event.user,
        {
          template_type: "button",
          text: 'Cabbage, Green peas, Avocados, Broccoli',
          buttons: [
            {
              type: 'web_url',
              title: 'plantjammer.com',
              url: 'https://www.app.plantjammer.com/myfridge',
            }
          ]

        }
      )
    })
})

//VEG_DELI __WHY_PLANTS __EATING_PLANTS
mbot.listen({
  text: /VEG_DELI/
}, (event) => {

  return mbot.getUser(event.user)
    .then(() => {
      return mbot.sendText(
        event.user,
        `Veggies are aromatic ninjas - they have 100X more aromas than meat. Learn how to get maximum out of aromas, and you're wll underway`
      )
    })
    .then(() => {
      return mbot.sendText(
        event.user,
        `
          1) Take an aroma-bomb dish and make it yours
          2) Make an aroma experiment in your home
        `,
        [
          {
            content_type: "text",
            title: "1",
            payload: "AROMA_BOMB"
          },
          {
            content_type: "text",
            title: "2",
            payload: "AROMA_EXPERIMENT"
          }
        ]
      )
    })
})

//AROMA_BOMB __VEG_DELI __WHY_PLANTS __EATING_PLANTS
mbot.listen({
  text: /AROMA_BOMB/
}, (event) => {

  return mbot.getUser(event.user)
    .then(() => {
      return mbot.sendText(
        event.user,
        `Try one of these three dishes:`
      )
    })
    .then(() => {
      return mbot.sendText(
        event.user,
        `
           1) Beetroot aroma bomb\n
           2) Celery root bonanza\n
           3) Eggplant pizza
        `,
        // [
        //   {
        //     content_type: "text",
        //     title: "1",
        //     payload: "AROMA_BOMB"
        //   },
        //   {
        //     content_type: "text",
        //     title: "2",
        //     payload: "AROMA_EXPERIMENT"
        //   }
        // ]
      )
    })
})

//AROMA_EXPERIMENT __VEG_DELI __WHY_PLANTS __EATING_PLANTS
mbot.listen({
  text: /AROMA_EXPERIMENT/
}, (event) => {

  return mbot.getUser(event.user)
    .then(() => {
      return mbot.sendText(
        event.user,
        `Try eating these three types of carrot:`
      )
    })
    .then(() => {
      return mbot.sendText(
        event.user,
        `
           1) Raw carrot\n\n
           2) Carrot fried in a bit of oil on a pan for 10 minutes until golden\n\n
           3) Carrot from (2), but with a bit of cinnamon in the oil and topped with a squeeze of lemon juice
        `,
        // [
        //   {
        //     content_type: "text",
        //     title: "1",
        //     payload: "AROMA_BOMB"
        //   },
        //   {
        //     content_type: "text",
        //     title: "2",
        //     payload: "AROMA_EXPERIMENT"
        //   }
        // ]
      )
    })
    .then(() => {
      return mbot.sendTemplate(
        event.user,
        {
          template_type: "button",
          text: 'Want to jam with carrot?',
          buttons: [
            {
              type: 'web_url',
              title: 'plantjammer.com',
              url: 'https://www.app.plantjammer.com/waterfall/salad/50',
            }
          ]

        }
      )
    })
})


// COOKING_ASSISTANT
mbot.listen({
  text: /COOKING_ASSISTANT/
}, (event) => {

  return mbot.getUser(event.user)
    .then(() => {
      return mbot.sendText(
        event.user,
        'ON CONSTRUCTION . . .'
      )
    })
    .then(() => {
      return mbot.sendText(
        event.user,
        'Go back',
        [
          {
            content_type: "text",
            title: "Start again",
            payload: "START_PLATJAMMER_BOT"
          }
        ]
      )
    })
})


// ABOUT
mbot.listen({
  text: /ABOUT/
}, (event) => {

  return mbot.getUser(event.user)
    .then(() => {
      return mbot.sendText(
        event.user,
        'ON CONSTRUCTION . . .'
      )
    })
    .then(() => {
      return mbot.sendText(
        event.user,
        'Go back',
        [
          {
            content_type: "text",
            title: "Start again",
            payload: "START_PLATJAMMER_BOT"
          }
        ]
      )
    })
})
