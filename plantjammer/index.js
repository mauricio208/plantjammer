const Mbot = require('../mbot');
const rp = require('request-promise');
const schedule = require('node-schedule');
const Promise = require('bluebird');

const mbot = new Mbot({name: 'mobilelife'});

// let cphHousesSingle;
// let arhusHousesSingle;
// let odenseHousesSingle;
// let alborgHousesSingle;
let cphHousesCouple;
let arhusHousesCouple;
let odenseHousesCouple;
let alborgHousesCouple;

const uspsMessages = [
  ['Tovtrækkeri med banker er langt og besværligt.Gør det smartere og find boliger tilpasset til dig og dit liv lige her ✌'],
  ['Træt af krøllet og langhårede formularer bare for at kunne se på drømmehjemmet?',
   'Få afklaret med det samme, om det er noget for dig og din økonomiske situation med SundayGo app\'en.'],
  ['Servicen tilpasses til dit budget.',
   'Drop både papirarbejdet og den uendelige bladren rundt efter interessante nye hjem. Med SundayGo kan du slippe for det tunge rugbrødsarbejde med en smart assistent, der giver dig en personligt tilpasset oversigt af boliger 💪'],
  ['Få nemt og hurtigt styr på, hvad det nu liiige var, der var jeres favorit sted og opkomende deadlines på fx fremvisninger direkte i app\'en SundayGo.'],
  ['Det kunne være ret fedt med en personlig mægler, der holdte styr på alt fra boliger, fremvisninger, budget og placeringer for dig, ikke ?', 
   'Vi er enige, så vi har lavet SundayGo til dig.Værså go\' og god jagt 😀'],
  ['Vi ville virkelig ønske, at vi kunne pakke vores eksperter fra banken ned i lomme- format, men det har vidst sig lidt sværere end som så 😅',
   'For at undgå flere uheldigt sammenpakkede bankfolk, har vi derfor kombineret teknologi med mange års erfaring og ekspertise, så du nemt kan søge bolige, der passer til din økonomi - slut med irrelevant støj!',
   'Hov, og fik jeg nævnt, at det selvfølgelig er gratis og alle må være med? Velbekomme!']
]

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

const queryCustomConstructor = (user, param) =>{
  qryConst = [];
  if (param && param.name === 'priceMax') {
    qryConst.push(param.value)
  }else{
    qryConst.push(user.custom.customSearch.priceMax)
  }
  if (param && param.name === 'areaMin') {
    qryConst.push(param.value)
  }else{
    qryConst.push(user.custom.customSearch.areaMin)
  }
  if (param && param.name === 'areaMax') {
    qryConst.push(param.value)
  }else{
    qryConst.push(user.custom.customSearch.areaMax)
  }
  if (param && param.name === 'roomMin') {
    qryConst.push(param.value)
  }else{
    qryConst.push(user.custom.customSearch.roomMin)
  }
  return qryConst;
}
const findHouses = (city, price, areaMin, areaMax, roomMin) => {
  queryContructor = {};
  if (city) {
    queryContructor['address'] = city
  }
  if (price) {
    queryContructor['priceMax'] = price
  }
  if (areaMin) {
    queryContructor['areaMin'] = areaMin
  }
  if (areaMax) {
    queryContructor['areaMax'] = areaMax
  }
  if (roomMin) {
    queryContructor['roomMin'] = roomMin
  }
  return rp({
    uri: 'https://mobilelife-api.danskebank.com/mobilelife/prod/home/homes/search',
    method: 'POST',
    body: {
      query: queryContructor
    },
    json: true
  })
}
const validateHouses = (cityHomes, houses, postalCodes) =>{
  if (houses && houses.homes && houses.homes.length > 0) {
    cityHomes = houses.homes;
    if (postalCodes) {
      haux = cityHomes.filter(h => -1 === postalCodes.indexOf(h.home.postalCode))
      cityHomes = haux.length > 0 ? haux : cityHomes
    }
  }
  return cityHomes
}
const updateHouses = (params, postalCodes) => {
  return findHouses('københavn', ...params)
    .then(housesK => {
      return findHouses('aarhus', ...params)
        .then(housesAar => {
          return findHouses('odense', ...params)
            .then(housesO => {
              return findHouses('aalborg', ...params)
                .then(housesAal => {
                  cphHousesCouple = validateHouses(cphHousesCouple, housesK, postalCodes)
                  arhusHousesCouple = validateHouses(arhusHousesCouple, housesAar, postalCodes)
                  odenseHousesCouple = validateHouses(odenseHousesCouple, housesO, postalCodes)
                  alborgHousesCouple = validateHouses(alborgHousesCouple, housesAal, postalCodes)
                  return Promise.resolve()
                })
            })
        })
    })
}


const sendDyrFlow = (event, user, parts) => {
  return mbot.sendText(
    event.user,
    'Selvom to huse har samme udbudspris, kan omkostningerne ved at bo i huset være vidt forskellige 😮'
  )
  .then(() => {
    return mbot.sendText(
      event.user,
      'Man er nødt til at se på boligens samlede udgifter, som for eksempel grundskyld, ejendomsværdiskat, el, vand og varme'
    )
  })
  .then(() => {
    return mbot.sendText(
      event.user,
      'Ved du hvad dit budget er, og dermed hvilke boliger du har råd til at købe? Ellers kan app\'en SundayGo hjælpe dig',
      [
        {
          content_type: "text",
          title: "Fortæl mig mere 👍",
          payload: `SUNDAY_GO_${parts[1]}`
        },
        {
          content_type: "text",
          title: "Vis næste bolig",
          payload: `DISLIKED_FOR DYR_${parts[1]}_OPTION`
        },
      ]
    )
  })
}


const showLikedHouses = (userId) => {
  let houses;
  let guser;
  return mbot.getUser(userId)
    .then(user => {
      guser = user;
      // houses = cphHousesSingle.filter(item =>
      //   user.custom.liked.indexOf(item.home.id) !== -1)
      //   .concat(cphHousesCouple.filter(item =>
      //     user.custom.liked.indexOf(item.home.id) !== -1))
      //   .concat(arhusHousesSingle.filter(item =>
      //     user.custom.liked.indexOf(item.home.id) !== -1))
      //   .concat(arhusHousesCouple.filter(item =>
      //     user.custom.liked.indexOf(item.home.id) !== -1))
      //   .concat(odenseHousesSingle.filter(item =>
      //     user.custom.liked.indexOf(item.home.id) !== -1))
      //   .concat(odenseHousesCouple.filter(item =>
      //     user.custom.liked.indexOf(item.home.id) !== -1))
      //   .concat(alborgHousesSingle.filter(item =>
      //     user.custom.liked.indexOf(item.home.id) !== -1))
      //   .concat(alborgHousesCouple.filter(item =>
      //     user.custom.liked.indexOf(item.home.id) !== -1))
      houses = cphHousesCouple.filter(item =>
        user.custom.liked.indexOf(item.home.id) !== -1)
        .concat(arhusHousesCouple.filter(item =>
          user.custom.liked.indexOf(item.home.id) !== -1))
        .concat(odenseHousesCouple.filter(item =>
          user.custom.liked.indexOf(item.home.id) !== -1))
        .concat(alborgHousesCouple.filter(item =>
          user.custom.liked.indexOf(item.home.id) !== -1))

      // add the houses from the other locations
      if (houses.length === 0) {
        if (user.custom.situation) {
          if (user.custom.currentCity) {
            payload = `${user.custom.currentCity.toUpperCase()}_OPTION_CITY_FLOW`
          } else {
            if (user.custom.situation === 'couple') {
              payload = 'SITUATION_VI_ER_ET_PAR_OPTION'

            } else {
              payload = 'NON_PAR_OPTIONS'
            }
          }

        } else {
          payload = 'KOM_IGANG_OPTION'
        }
        return mbot.sendText(
          userId,
          'Når du synes godt om boliger vil de blive gemt og vist her',
          [
            {
              content_type: "text",
              title: "Vis mig en bolig",
              payload: payload
            },
          ]
        );

      }

      return mbot.sendText(
        userId,
        'Her er de boliger du har syntes godt om 👍'
      ).then(() => {
        return mbot.sendTemplate(
          userId,
          {
            template_type: "generic",
            elements: houses.map((item, index) => {
              tempHouse = item.home;
              return {
                title: `${tempHouse.price.toLocaleString('en-US').replace(/,/g, '.')} kr. | ${tempHouse.areaHome} m2` +
                ` | ${tempHouse.roomCount} rum`,
                subtitle: ` ${tempHouse.postalCode} ${tempHouse.city}`,
                image_url: tempHouse.imageUrl,
                default_action: {
                  type: 'web_url',
                  url: tempHouse.postingUrl,
                  messenger_extensions: false,
                  webview_height_ratio: 'tall',
                },
                buttons: [
                  {
                    type: 'web_url',
                    title: 'Se mere',
                    url: tempHouse.postingUrl
                  },
                  {
                    type: 'web_url',
                    title: 'Åbn SundayGo',
                    url: `https://sunday.dk/`,
                  },
                  {
                    type: "element_share"
                  }
                  // {
                  //   type: 'postback',
                  //   title: 'Remove house',
                  //   payload: `REMOVE_LIKED_${index}_OPTION`
                  // },
                ]
              }
            })
          }
        )
      })
        .then(() => {
          return mbot.sendText(
            userId,
            'SundayGo er hvor du nemt kan lægge et budget, og booke fremvisinger på tværs af mæglerkæder! 🙌'
          )
        })
    })
    
}

const showCardAndUpdate = (userId, city) => {
  let houses;
  let guser;
  let tempHouse;
  
  return mbot.getUser(userId)
  .then(user => {
    
    // console.log(user);
    guser = user;
    
    // if (city === 'cph') {
    //   if (user.custom.situation === 'single') {
    //     houses = cphHousesSingle.slice();
    //   } else {
    //     houses = cphHousesCouple.slice();
    //   }
    // } else if (city === 'arhus') {
    //   if (user.custom.situation === 'single') {
    //     houses = arhusHousesSingle.slice();
    //   } else {
    //     houses = arhusHousesCouple.slice();
    //   }
    // } else if (city === 'odense') {
    //   if (user.custom.situation === 'single') {
    //     houses = odenseHousesSingle.slice();
    //   } else {
    //     houses = odenseHousesCouple.slice();
    //   }
    // } else if (city === 'alborg') {
    //   if (user.custom.situation === 'single') {
    //     houses = alborgHousesSingle.slice();
    //   } else {
    //     houses = alborgHousesCouple.slice();
    //   }
    // }

    if (city && user.custom.situation){
      houses = cphHousesCouple.concat(arhusHousesCouple,odenseHousesCouple,alborgHousesCouple)
      if (city === 'københavn') {
        housesAux = cphHousesCouple.slice();
        houses = housesAux.length > 0 ? housesAux:houses //if no houses for a city, show all houses
      } else if (city === 'aarhus') {
        housesAux = arhusHousesCouple.slice();
        houses = housesAux.length > 0 ? housesAux:houses //if no houses for a city, show all houses
      } else if (city === 'odense') {
        housesAux = odenseHousesCouple.slice();
        houses = housesAux.length > 0 ? housesAux:houses //if no houses for a city, show all houses
      } else if (city === 'aalborg') {
        housesAux = alborgHousesCouple.slice();
        houses = housesAux.length > 0 ? housesAux:houses //if no houses for a city, show all houses
      }
      houses = houses.filter(item => {
        if (user.custom.seen.indexOf(item.home.id) === -1) {
          return true;
        } else {
          return false;
        }
      })
      tempHouse = houses[0].home;
      return mbot.sendTemplate(
        userId,
        {
          template_type: "generic",
          elements: [
            {
              title: `${tempHouse.price.toLocaleString('en-US').replace(/,/g, '.')} kr. | ${tempHouse.areaHome} m2` +
              ` | ${tempHouse.roomCount} rum`,
              subtitle: `${tempHouse.postalCode} ${tempHouse.city}`,
              image_url: tempHouse.imageUrl,
              default_action: {
                type: 'web_url',
                url: tempHouse.postingUrl,
                messenger_extensions: false,
                webview_height_ratio: 'tall',
              },
              buttons: [
                {
                  type: 'web_url',
                  title: 'Se hos mægler',
                  url: tempHouse.postingUrl
                },
                {
                  type: "element_share"
                },
              ]
            }
          ]
        },
        [
          {
            content_type: "text",
            title: "Synes godt om 👍",
            payload: `SYNES_GODT_OM_SELECTING_FROM_HOUSE_${tempHouse.id}`
          },
          {
            content_type: "text",
            title: 'Ikke lige mig 👎',
            payload: `ELLERS_TAK_SELECTING_FROM_HOUSE_${tempHouse.id}`
          },
        ]
      )
      .then(() => {
        guser.custom.seen.push(tempHouse.id);
        guser.markModified('custom');
        return guser.save();
      })
    }else{
      if (user.custom.situation) {
        if (user.custom.currentCity) {
          payload = `${user.custom.currentCity.toUpperCase()}_OPTION_CITY_FLOW`
        } else {
          if (user.custom.situation === 'couple') {
            payload = 'SITUATION_VI_ER_ET_PAR_OPTION'

          } else {
            payload = 'NON_PAR_OPTIONS'
          }
        }
      } else {
        payload = 'KOM_IGANG_OPTION'
      }
      return mbot.sendText(
        userId,
        'Når du synes godt om boliger vil de blive gemt og vist her',
        [
          {
            content_type: "text",
            title: "Vis mig en bolig",
            payload: payload
          },
        ]
      );
    }
  })
}

const updateLikedHouses = (user, houses) =>{
  user.custom.liked = user.custom.liked.filter(id => {
    return houses.findIndex((item) => item.home.id === id) !== -1
  })
  user.markModified('custom');
  return user.save()
}

const checkIfNewHouses = () => {
  // check if new houses
  const attributes = [
    {
      id: 1,
      name: 'københavn',
      price: 5000000,
      //areaMin: 65,
      //areaMax: 100,
      //roomMin: 3
    },
    {
      id: 2,
      name: 'aarhus',
      price: 5000000,
      //areaMin: 65,
      //areaMax: 100,
      //roomMin: 3
    },
    {
      id: 3,
      name: 'odense',
      price: 5000000,
      //areaMin: 65,
      //areaMax: 100,
      //roomMin: 3
    },
    {
      id: 4,
      name: 'aalborg',
      price: 5000000,
      //areaMin: 65,
      //areaMax: 100,
      //roomMin: 3
    },
  ]
  return Promise.map(attributes, city => {
    return findHouses(city.name, city.price, city.areaMin, city.areaMax, city.roomMin)
    .then(houses => {
      let tempHouses;
      if (city.id === 1) {
        tempHouses = cphHousesCouple;
      }
      if (city.id === 2) {
        tempHouses = arhusHousesCouple;
      }
      if (city.id === 3) {
        tempHouses = odenseHousesCouple;
      }
      if (city.id === 4) {
        tempHouses = alborgHousesCouple;
      }
      mbot.getFacebookUser().find({})
        .then(users =>{
          return Promise.map(users, user => {
            if (tempHouses && user.custom && user.custom.liked && user.custom.liked.length > 0){
              updateLikedHouses(user, tempHouses)
            }
            return Promise.resolve();
          })
        })
        .catch(err => Promise.resolve());
      if (houses.homes[0].home.id !== tempHouses[0].home.id) {
        // new house
        return mbot.getFacebookUser().find({})
        .then(fusers => {
          return Promise.map(fusers, fuser => {
            if (fuser.custom && user.custom.currentCity === city.name) {
              // here
              return mbot.sendText(
                fuser.fid,
                '🔥🔥🔥 Så er der en ny bolig på markedet'
              )
              .then(() => {
                let tempHouse = tempHouses[0].home;
                return mbot.sendTemplate(
                  fuser.fid,
                  {
                    template_type: "generic",
                    elements: [
                      {
                        title: `${tempHouse.price.toLocaleString('en-US').replace(/,/g, '.')} kr. | ${tempHouse.areaHome} m2` +
                        ` | ${tempHouse.roomCount} rum`,
                        subtitle: `${tempHouse.postalCode} ${tempHouse.city}`,
                        image_url: tempHouse.imageUrl,
                        default_action: {
                          type: 'web_url',
                          url: tempHouse.postingUrl,
                          messenger_extensions: false,
                          webview_height_ratio: 'tall',
                        },
                        buttons: [
                          {
                            type: 'web_url',
                            title: 'Se hos sunday',
                            url: tempHouse.postingUrl
                          },
                          {
                            type: "element_share"
                          },
                        ]
                      }
                    ]
                  },
                  [
                    {
                      content_type: "text",
                      title: "Synes godt om 👍",
                      payload: `SYNES_GODT_OM_SELECTING_FROM_HOUSE_${tempHouse.id}`
                    },
                    {
                      content_type: "text",
                      title: 'Ikke lige mig 👎',
                      payload: `ELLERS_TAK_SELECTING_FROM_HOUSE_${tempHouse.id}`
                    },
                  ]
                )
              })
              .catch(err => Promise.resolve())
            }
            return Promise.resolve();
          })
          .catch(err => Promise.resolve());
        })
        .catch(err => Promise.resolve());
      } else {
        return Promise.resolve();
      }
    })
    .catch(err => Promise.resolve());
  })
}

mbot.start()
.then(() => {
  // single houses
  // findHouses('københavn', 2200000, 50, 70, 2)
  // .then(houses => {
  //   cphHousesSingle = houses.homes;
  // })
  // findHouses('aarhus', 2200000, 50, 70, 2)
  // .then(houses => {
  //   arhusHousesSingle = houses.homes;
  // })
  // findHouses('odense', 2200000, 50, 70, 2)
  // .then(houses => {
  //   odenseHousesSingle = houses.homes;
  // })
  // findHouses('aalborg', 2200000, 50, 70, 2)
  // .then(houses => {
  //   alborgHousesSingle = houses.homes;
  // })
  // couple houses
  findHouses('københavn', 5000000)
  .then(houses => {
    cphHousesCouple = houses.homes;
  })
  findHouses('aarhus', 5000000)
  .then(houses => {
    arhusHousesCouple = houses.homes;
  })
  findHouses('odense', 5000000)
  .then(houses => {
    odenseHousesCouple = houses.homes;
  })
  findHouses('aalborg', 5000000)
  .then(houses => {
    alborgHousesCouple = houses.homes;
  })
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
              // {
              //   title: "Customize Search Engine",
              //   type: "nested",
              //   call_to_actions: [
              //     // {
              //     //   type: "postback",
              //     //   title: "Customize search parameters",
              //     //   payload: "CUSTOM_SEARCH"
              //     // },
              //     {
              //       type: "postback",
              //       title: "Reset to default search",
              //       payload: "CONFIRM_DEFAULT_SEARCH"
              //     },
              //   ]
              // },
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
  // cron job that check every 30 minutes
  const notifications = schedule.scheduleJob('0,30 * * * *', () => {
    checkIfNewHouses();
  });
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
  // .then(()=>{
  //   return mbot.sendText(
  //     event.user,
  //     'Hvis du ikke kender SundayGo skal du helt sikkert checke dem ud 😉'
  //   )
  // })
  // .then(()=>{
  //   return mbot.sendTemplate(
  //     event.user,
  //     {
  //       template_type: "button",
  //       text: 'Du kan nemt lægge et budget som du kan søge boliger ud fra, og du kan booke fremvisinger på tværs af mæglerkæder 🙌',
  //       buttons: [
  //         {
  //           type: 'web_url',
  //           title: 'Åbn SundayGo',
  //           url: `https://sunday.dk/`,
  //         }
  //       ]

  //     }
  //   )
  // })
})

// GET_STARTED_PAYLOAD
mbot.listen({
  text: /GET_STARTED_PAYLOAD|restart/
}, (event) => {

  let temp;
  return mbot.getUser(event.user)
  .then(user => {
    user.custom = {};
    user.custom.seen = [];
    user.custom.liked = [];
    user.custom.disliked = [];
    user.custom.customSearch = { priceMax: 5000000};
    user.markModified('custom');
    return user.save();
  })
  .then(user => {
    return mbot.sendText(
      event.user,
      `Hej ${user.firstName }, jeg er sat i verden for at være din nye Boligbuddy 👋`

    )}
  )
  .then(() => {
    return mbot.sendText(
      event.user,
      'Jeg bruger kunstig intelligens til at lære dig og dine boligbehov at kende - så jo mere du bruger mig, jo mere lærer jeg om dine ønsker 😊'
    )
  })
  .then(() => {
    return mbot.sendText(
      event.user,
      'Så du kan måske forstå mig som din personlige ejendomsmægler, der altid leder efter det bedste til dig - og kan give dig besked lige her, når jeg finder noget! 👊'
    )
  })
  .then(() => {
    return mbot.sendText(
      event.user,
      'Er vi klar til at gå i gang?',
      [
        {
          content_type: "text",
          title: "Yeah buddy! 👍",
          payload: "KOM_IGANG_OPTION"
        }
      ]
    )
  })
})

//CONFIRM_DEFAULT_SEARCH
mbot.listen({
  text: /CONFIRM_DEFAULT_SEARCH/
}, (event) => {
  return mbot.sendText(
    event.user,
    'Are you sure you want to restart to default search engine parameters?',
    [
      {
        content_type: "text",
        title: "Yes",
        payload: "DEFAULT_SEARCH"
      },
      {
        content_type: "text",
        title: "No",
        payload: "KOM_IGANG_OPTION"
      }
    ]
  )
})

//DEFAULT_SEARCH
mbot.listen({
  text: /DEFAULT_SEARCH/
}, (event) => {
  return mbot.getUser(event.user)
  .then(user=>{
    user.custom.customSearch = { priceMax: 5000000 };
    user.markModified('custom');
    return user.save();
  })
  .then(user=>{
    params = queryCustomConstructor(user);
    updateHouses(params);
    payloadContinue = {
      content_type: "text",
      title: "Lad os det 👍",
      payload: "KOM_IGANG_OPTION"
    }

    if (user.custom.situation === 'couple') {
      payloadContinue.payload = 'SITUATION_VI_ER_ET_PAR_OPTION';
      payloadContinue.title = 'Select city'
    }
    // if (user.custom.situation === 'single') {
    //   payloadContinue.payload = 'NON_PAR_OPTIONS';
    //   payloadContinue.title = 'Continue'
    // }

    return mbot.sendText(
      event.user,
      'Search engine parameter restored to defaults',
      [
        payloadContinue
      ]
    )

  })

})



//CUSTOM_SEARCH
mbot.listen({
  text: /(.+)_CUSTOMIZE_(.+)/
},(event)=>{
  const parameters = event.text.split('_CUSTOMIZE_')
  parameter = parameters[0]
  houseId = parameters[1]
  houses = cphHousesCouple.concat(arhusHousesCouple,odenseHousesCouple,alborgHousesCouple)
  house = houses.find(hh => houseId === hh.home.id)
  reason = 'Har ikke råd'
  if (parameter === 'areaMin'){
    reason = 'få m2'
  }
  if (parameter === 'badLocation'){
    reason = 'Post nr.'
  }
  return mbot.getUser(event.user)
  .then((user)=>{
    let value = undefined;
    
    if (parameter === 'badLocation') {
      value = house.home.postalCode
      // haux = cphHousesCouple.filter(h => value !== h.home.postalCode)
      // cphHousesCouple = haux.length > 0 ? haux:cphHousesCouple

      // haux = arhusHousesCouple.filter(h => value !== h.home.postalCode)
      // arhusHousesCouple = haux.length > 0 ? haux:arhusHousesCouple

      // haux = odenseHousesCouple.filter(h => value !== h.home.postalCode)
      // odenseHousesCouple = haux.length > 0 ? haux:odenseHousesCouple

      // haux = alborgHousesCouple.filter(h => value !== h.home.postalCode)
      // alborgHousesCouple = haux.length > 0 ? haux:alborgHousesCouple

      if (user.custom.customSearch[parameter]){
        user.custom.customSearch[parameter].push(value)
      }else{
        user.custom.customSearch[parameter] = [value]
      }

    }else{
      if (parameter === 'priceMax') { 
        value = parseInt(house.home.price - (house.home.price * 0.1))
      }
      if (parameter === 'areaMin') {
        value = parseInt(house.home.areaHome + (house.home.areaHome * 0.1))
      }
      user.custom.customSearch[parameter] = value
    }
    user.markModified('custom');
    user.save();
    if (parameters === 'badLocation'){
      params = queryCustomConstructor(user)
    }else{
      params = queryCustomConstructor(user, { name: parameter, value: value });
    }
    return updateHouses(params, user.custom.customSearch['badLocation'])
      .then(()=>{
        if(parameter === 'priceMax'){
          if (user.custom.cantAffordNth){ 
            // return mbot.sendTemplate(
            //   event.user,
            //   {
            //     template_type: "button",
            //     text: 'Husk at checke boligen i SundayGo for at være sikker på om du har råd eller ej 😉',
            //     buttons: [
            //       {
            //         type: 'web_url',
            //         title: 'Åbn SundayGo',
            //         url: `https://sunday.dk/`,
            //       }
            //     ]
    
            //   },
            //   [
            //     {
            //       content_type: "text",
            //       title: "Find flere",
            //       payload: `NEXT_HOUSE_${user.custom.currentCity}`
            //     }
            //   ]
            // )
            let uspsMsg = getRandomFromArray(uspsMessages)
            let templateParams = [
              {
              template_type: "button",
              text: uspsMsg[uspsMsg.length-1],
              buttons: [
                {
                  type: 'web_url',
                  title: 'Åbn SundayGo',
                  url: `https://sunday.dk/`,
                }
              ]
              },
              [
                {
                  content_type: "text",
                  title: "Find flere",
                  payload: `NEXT_HOUSE_${user.custom.currentCity}`
                }
              ]
            ]
            return recursiveSendText(event, uspsMsg, templateParams)
            .then(() => {
              user.custom.disliked.push({ reason: reason, id: houseId });
              user.markModified('custom');
              return user.save();
            })
          }else{
            return mbot.sendText(
              event.user,
              'Må jeg lige hurtigt indskyde at det ikke altid er udbudsprisen der er afgørende for om man har råd til en bolig 😮'
            )
            .then(() => {
              return mbot.sendText(
                event.user,
                'Man er nødt til at se på boligens samlede udgifter, som for eksempel grundskyld, ejendomsværdiskat, el, vand og varme.'
              )
            })
            .then(() => {
              return mbot.sendTemplate(
                event.user,
                {
                  template_type: "button",
                  text: 'Ved du hvad dit budget er, og dermed hvilke boliger du har råd til at købe? Ellers kan mine gode venner fra SundayGo hjælpe dig på vej 👍',
                  buttons: [
                    {
                      type: 'web_url',
                      title: 'Åbn SundayGo',
                      url: `https://sunday.dk/`,
                    }
                  ]
    
                },
                [
                  {
                    content_type: "text",
                    title: "Find flere",
                    payload: `NEXT_HOUSE_${user.custom.currentCity}`
                  }
                ]
              )
                .then(() => {
                  user.custom.cantAffordNth = true
                  user.custom.disliked.push({ reason: reason, id: houseId });
                  user.markModified('custom');
                  return user.save();
                })
            })
          }
        }else{
          return mbot.sendText(
            event.user,
            'Got it! 👍'
          )
          .then(() => {
            user.custom.disliked.push({ reason: reason, id: houseId });
            user.markModified('custom');
            return user.save();
          })
          .then(user => showCardAndUpdate(event.user, user.custom.currentCity))
        }
      })
  })
})

// CONFIG
mbot.listen({
  text: /CONFIG/
}, (event) => {
  return mbot.sendText(
      event.user,
      'Her kan du stoppe/starte din BoligBuddy'
    )
  .then(() => {
      return mbot.sendText(
        event.user,
        'Du kan også opsætte en ny BoligBuddy, men vær opmærksom på at i øjeblikket kan du kun have en BoligBuddy af gangen 😉',
        [
          {
            content_type: "text",
            title: "Stop BoligBuddy 😢",
            payload: ""
          },
          {
            content_type: "text",
            title: "Opsæt ny BoligBuddy",
            payload: "restart"
          },
        ]
      )
  }) 
})


// KOM_IGANG_OPTION
mbot.listen({
  text: 'KOM_IGANG_OPTION'
}, (event) => {

  return mbot.sendText(
    event.user,
    'YES - allerede buddies, jeg er vild med det 👊'
  ) 
  .then(()=>{
    return mbot.sendText(
      event.user,
      'Okay, så jeg bliver trænet af mine skabere til at hjælpe forskellige segmenter af boligsøgende, og her til at starte med kan jeg hjælpe unge par der leder efter bolig sammen 💑'
    )
  })
  .then(()=>{
    return mbot.sendText(
      event.user,
      'Hvordan lyder det?',
      [
        {
          content_type: "text",
          title: "Vi er et ungt par 👍",
          payload: "SITUATION_VI_ER_ET_PAR_OPTION"
        },
        {
          content_type: "text",
          title: "Det er vi ikke 👎",
          payload: "NON_PAR_OPTIONS"
        },
      ]
    )
  })
  // return mbot.sendText(
  //   event.user,
  //   "😎\n\nBoligBuddy bliver trænet til at foreslå boliger baseret på " +
  //   "forskellige livssituationer og forskellige byer 👪"
  // )
  // .then(() => mbot.sendText(
  //   event.user,
  //   "Vælg din livssituation 👇",
  //   [
  //     {
  //       content_type: "text",
  //       title: "Jeg er nyuddannet",
  //       payload: "SITUATION_JEG_ER_NYUDDANNET_OPTION"
  //     },
  //     {
  //       content_type: "text",
  //       title: "Vi er et par",
  //       payload: "SITUATION_VI_ER_ET_PAR_OPTION"
  //     },
  //     {
  //       content_type: "text",
  //       title: "Ingen af delene",
  //       payload: "SITUATION_INGEN_AF_DELENE_OPTION"
  //     },
  //   ]
  // ))
})

// NON_PAR_OPTIONS
mbot.listen({
  text: /NON_PAR_OPTIONS/
}, (event) => {
  return mbot.sendText(
    event.user,
    `Damn! 😞

    Hvad med du fortæller mig hvilket segment du tilhører, så giver jeg besked når jeg kan hjælpe dig 😉`,
    [
      {
        content_type: "text",
        title: "Mere plads til børn",
        payload: "FEEDBACK"
      },
      {
        content_type: "text",
        title: "Nyuddannet",
        payload: "FEEDBACK"
      },
      {
        content_type: "text",
        title: "Forældrekøb",
        payload: "FEEDBACK"
      },
      {
        content_type: "text",
        title: "Drømmer om have",
        payload: "FEEDBACK"
      },
      {
        content_type: "text",
        title: "Fraskilt",
        payload: "FEEDBACK"
      }
    ]
  )
})

// FEEDBACK
mbot.listen({
  text: /FEEDBACK/
}, (event) => {
  let uspsMsg = getRandomFromArray(uspsMessages)
  let templateParams = [
    {
      template_type: "button",
      text: uspsMsg[uspsMsg.length-1],
      buttons: [
        {
          type: 'web_url',
          title: 'Åbn SundayGo',
          url: `https://sunday.dk/`,
        }
      ]
    }
  ]
  return recursiveSendText(event, uspsMsg, templateParams)

  // return mbot.sendText(
  //   event.user,
  //   'Jeg giver mine skabere besked 👍'
  // )
  // .then(()=>{
  //   return mbot.sendTemplate(
  //     event.user,
  //     {
  //       template_type: "button",
  //       text: 'I mellemtiden kan det være du skulle checke mine gode venner fra SundayGo ud? Med SundayGo du nemt lægge et budget at søge alle typer boliger ud fra, du kan endda bestille fremvisninger på tværs af alle mæglerkæder! 😮',
  //       buttons: [
  //         {
  //           type: 'web_url',
  //           title: 'Åbn SundayGo',
  //           url: `https://sunday.dk/`,
  //         }
  //       ]

  //     }
  //   )
  // })

})

// SITUATION_(.+)_OPTION
mbot.listen({
  text: /^SITUATION_(.+)_OPTION/
}, (event) => {
  // save SITUATION
  let situation = event.text.replace(/SITUATION_|_OPTION/g,'');
  // if (situation === 'JEG_ER_NYUDDANNET' || situation === 'INGEN_AF_DELENE') {
  //   situation = 'single';
  // } else {
  //   situation = 'couple';
  // }
  if (situation === 'NON_PAR') {
    situation = 'single';
  } else {
    situation = 'couple';
  }
  return mbot.getUser(event.user)
  .then(user => {
    user.custom.situation = situation;
    user.markModified('custom');
    return user.save();
  })
  .then(user => {
    return mbot.sendText(
      event.user,
      'Yay, lad os komme igang så! 😀'
    )
    .then(()=>{
      return mbot.sendText(
        event.user,
        'Hvilken by, vil du have mig til søge efter boliger til dig i 🔎?'
      )
    })
    .then(() => {
        return mbot.sendText(
          event.user,
          'Lige nu kan jeg søge i de 4 største byer, men tilføjer løbende nye, så hvis din by eller område mangler, så giv mig endelig besked 💪',
          [
            {
              content_type: "text",
              title: "København",
              payload: "KØBENHAVN_OPTION_CITY_FLOW"
            },
            {
              content_type: "text",
              title: "Århus",
              payload: "AARHUS_OPTION_CITY_FLOW"
            },
            {
              content_type: "text",
              title: "Odense",
              payload: "ODENSE_OPTION_CITY_FLOW"
            },
            {
              content_type: "text",
              title: "Ålborg",
              payload: "AALBORG_OPTION_CITY_FLOW"
            },
            {
              content_type: "text",
              title: "Foreslå andet",
              payload: "ANDEN_OPT_FLOW"
            }
          ]
        )
    })
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


mbot.listen({
  text: /ANDEN_OPT_FLOW/
}, (event) => {
  return mbot.sendText(
    event.user,
    'Got it! Hvilken by eller område leder du efter bolig i?',
    [
      {
        content_type: "text",
        title: "Nordjylland",
        payload: "ANDEN_FLOW"
      },
      {
        content_type: "text",
        title: "Midtjylland",
        payload: "ANDEN_FLOW"
      },
      {
        content_type: "text",
        title: "Sønderjylland",
        payload: "ANDEN_FLOW"
      },
      {
        content_type: "text",
        title: "Fyn",
        payload: "ANDEN_FLOW"
      },
      {
        content_type: "text",
        title: "Vestsjælland",
        payload: "ANDEN_FLOW"
      },
      {
        content_type: "text",
        title: "Bornholm",
        payload: "ANDEN_FLOW"
      },
    ]
  )
})



mbot.listen({
  text: /ANDEN_FLOW/
}, (event) => {
  const parts = event.text.split('SHORT_SUNDAY_GO_');
  let uspsMsg = getRandomFromArray(uspsMessages)
  let templateParams = [
    {
      template_type: "button",
      text: uspsMsg[uspsMsg.length-1],
      buttons: [
        {
          type: 'web_url',
          title: 'Åbn SundayGo',
          url: `https://sunday.dk/`,
        }
      ]
    }
  ]
  return recursiveSendText(event, uspsMsg, templateParams)

  // return mbot.sendText(
  //   event.user,
  //   'Jeg giver mine skabere besked 👍'
  // )
  // .then(()=>{
  //   return mbot.sendTemplate(
  //     event.user,
  //     {
  //       template_type: "button",
  //       text: 'I mellemtiden kan det være du skulle checke mine gode venner fra SundayGo ud? Med SundayGo du nemt lægge et budget at søge alle typer boliger ud fra, du kan endda bestille fremvisninger på tværs af alle mæglerkæder! 😮',
  //       buttons: [
  //         {
  //           type: 'web_url',
  //           title: 'Åbn SundayGo',
  //           url: 'https://sunday.dk/'
  //         }
  //       ]

  //     }
  //   )
  // })
})


//NEXT_HOUSE_
mbot.listen({
  text: /NEXT_HOUSE_(.+)/
}, (event) => {
  const parts = event.text.split('NEXT_HOUSE_');
  showCardAndUpdate(event.user, parts[1])
})

//SHORT_SUNDAY_GO_
mbot.listen({
  text: /SHORT_SUNDAY_GO_(.+)/
}, (event) => {
  const parts = event.text.split('SHORT_SUNDAY_GO_');
  let uspsMsg = getRandomFromArray(uspsMessages)
  let templateParams = [
    {
      template_type: "button",
      text: uspsMsg[uspsMsg.length-1],
      buttons: [
        {
          type: 'web_url',
          title: 'Åbn SundayGo',
          url: `https://sunday.dk/`,
        }
      ]
    }
  ]
  return recursiveSendText(event, uspsMsg, templateParams)

  // return mbot.sendTemplate(
  //   event.user,
  //   {
  //     template_type: "button",
  //     text: 'Så vil jeg gerne anbefale mine gode venner fra SundayGo 🙌 Med SundayGo kan du bestille fremvisninger på tværs af alle mæglerkæder! 😮',
  //     buttons: [
  //       {
  //         type: 'web_url',
  //         title: 'Åbn SundayGo',
  //         url: 'https://sunday.dk/'//`https://share.sunday.dk/go/${parts[1]}`,
  //       }
  //     ]

  //   }
  // )
})



// _SELECTING_FROM_HOUSE_
mbot.listen({
  text: /(.+)_SELECTING_FROM_HOUSE_(.+)/
}, (event) => {
  let nextStepQuickReplay = true
  const parts = event.text.split('_SELECTING_FROM_HOUSE_');
  if (parts[0] === 'SYNES_GODT_OM') {
    return mbot.sendText(
      event.user,
      'Yes! 🙌'
    )
    .then(() => {
      return mbot.sendText(
        event.user,
        'I menuen har jeg gemt boligen, så du altid kan finde den frem igen 👏'
      )
    })
    .then(() => mbot.getUser(event.user))
    .then(user => {
      nextStepQuickReplay = user.custom.nextStepLike
      user.custom.nextStepLike = nextStepQuickReplay ? false:true
      if (user.custom && user.custom.liked && user.custom.liked.length === 0 &&
        !user.custom.firstLike) {
        console.log('first time');
        user.custom.firstLike = true;
        setTimeout(() => {
          sendDyrFlow(event, user, parts);
        }, 300000);
      }
      user.custom.liked.push(parts[1]);
      user.markModified('custom');
      return user.save();
    })
    .then(user => {
      if (nextStepQuickReplay){
        return mbot.sendText(
          event.user,
          'Hvad så nu? Er du muligvis interesseret i en fremvisning, eller skal vi lede efter flere magen til? 😊',
          [
            {
              content_type: 'text',
              title: 'Book fremvisning',
              payload: `SHORT_SUNDAY_GO_${parts[1]}`
            },
            {
              content_type: 'text',
              title: 'Find flere',
              payload: `NEXT_HOUSE_${user.custom.currentCity}`
            },
          ]
        )
      }else{
        showCardAndUpdate(event.user, user.custom.currentCity)
      }
    })
  } else {
    dislikeMsg = getRandomFromArray([
      'Aww.Sorry! 😥',
      'Woups, sorry! Min fejl 🙄',
      'Av min arm - den var værre, hva? Beklager makker, men skal ikke bare prøve igen 😁 ?',
      'Nej, nej, nej.Det kunne jeg da have sagt mig selv! Dårligt valg, I know! En gang til 😅 ?',
      'Ups.Ja okay, man kan jo ikke vinde hver gang vel 😓 ?', 
      'Pardon me good sir 🙄 - lidt pinlig fejl, men må jeg ikke lige prøve igen?' 
    ])
    return mbot.getUser(event.user)
    .then(user=>{
      return mbot.sendText(
        event.user,
        dislikeMsg
      )
      .then(()=>{
        return mbot.sendText(
          event.user,
          'Jeg vil gerne blive bedre, så hvad var der galt med den?😅',
          [ 
            {
              content_type: 'text',
              title: 'For dyr',
              payload: `SUBFLOW_FOR_DYR_${parts[1]}`//`DISLIKED_FOR DYR_${parts[1]}_OPTION`
            },
            {
              content_type: 'text',
              title: 'Rumfordelig',
              payload: `DISLIKED_RUMFORDELIGEN_${parts[1]}_OPTION`
            },
            // {
            //   content_type: "text",
            //   title: "Beliggenheden",
            //   payload: `DISLIKED_BELIGGENHEDEN_${parts[1]}_OPTION` //bad location flow
            // },
            {
              content_type: "text",
              title: 'Forkert post nr.',
              payload: `badLocation_CUSTOMIZE_${parts[1]}`
            },
            {
              content_type: "text",
              title: "For få værelser",
              payload: `DISLIKED_FÅ VÆRELSER_${parts[1]}_OPTION` //bad location flow
            },
            {
              content_type: "text",
              title: 'For få m2',
              payload: `areaMin_CUSTOMIZE_${parts[1]}`
            },
            
            // {
            //   content_type: 'text',
            //   title: 'Har ikke råd',
            //   payload: `priceMax_CUSTOMIZE_${parts[1]}` //"DISLIKED_FOR LILLE_" + parts[1] + "_OPTION" // too small flow
            // }
          ]
        )
      })
    })
  }
})

//SUBFLOW_FOR_DYR_
mbot.listen({
  text: /SUBFLOW_FOR_DYR_(.+)/
}, (event) => {
  const parts = event.text.split('SUBFLOW_FOR_DYR_');
  return mbot.sendText(
    event.user,
    'Hmm 🤔\n\nFordi du ikke mener du får nok bolig for pengene, eller at du ikke har råd?',
    [
      {
        content_type: 'text',
        title: 'Ikke nok for pengene',
        payload: `DISLIKED_IKKE NOK FOR PENGENE_${parts[1]}_OPTION`
      },
      {
        content_type: 'text',
        title: 'Har ikke råd',
        payload: `priceMax_CUSTOMIZE_${parts[1]}` //"DISLIKED_FOR LILLE_" + parts[1] + "_OPTION" // too small flow
      }
    ]
  )
})



//SUNDAY_GO
mbot.listen({
  text: /SUNDAY_GO_(.+)/
}, (event) => {
  const parts = event.text.split('SUNDAY_GO_');
  return mbot.sendText(
    event.user,
    'Med SundayGo kan du:\n\n- Søg bolig ud fra dit budget og få vist boliger, du rent faktisk har råd til at købe.Man slipper dermed for en tur i banken.'
  )
  .then(() => {
    return mbot.sendText(
      event.user,
      '- App’en regner på boligens samlede udgifter, som for eksempel grundskyld, ejendomsværdiskat, el, vand og varme.Det er således ikke kun udbudsprisen man får et overblik over, det er også den fremtidige økonomi.'
    )
  })
  .then(() => {
    return mbot.sendText(
      event.user,
      '- Book fremvisning direkte i app’en og få et samlet overblik over de aftalte fremvisninger på tværs af alle mæglere og bookingsystemer.'
    )
  })
  .then(() => {
    return mbot.sendText(
      event.user,
      '- SundayGo hjælper desuden med at stille de rigtige spørgsmål i forbindelse med fremvisninger.'
    )
  })
  // .then(() => {
  //   return mbot.sendText(
  //     event.user,
  //     '- Der er også mulighed for at tilføje egne noter samt sammenligne og vurdere boligerne.'
  //   )
  // })
  .then(() => {
    return mbot.sendTemplate(
      event.user,
      {
        template_type: "button",
        text: '- Der er også mulighed for at tilføje egne noter samt sammenligne og vurdere boligerne.',
        buttons: [
          {
            type: 'web_url',
            title: 'Kom i gang 👍',
            url: `https://share.sunday.dk/go/${parts[1]}`,
          }
        ]

      },
      [
        {
          content_type: "text",
          title: "Vis mig næste bolig",
          payload: `DISLIKED_FOR DYR_${parts[1]}_OPTION`
        }
      ]
    )
  })
})

mbot.listen({
  text: /^VIS_MIG_BOLIG$/g
}, (event) => {
  return mbot.getUser(event.user)
  .then(user => showCardAndUpdate(event.user, user.custom.currentCity))
})


// DISLIKED
mbot.listen({
  text: /^DISLIKED_(.+)_OPTION$/g
}, (event) => {
  const parts = event.text.replace(/DISLIKED_|_OPTION/g,'').split('_');
  return mbot.sendText(
    event.user,
    'Hvad med den her bolig? 🤔'
  )
  .then(() => mbot.getUser(event.user))
  .then(user => {
    user.custom.disliked.push({reason: parts[0], id: parts[1]});
    user.markModified('custom');
    return user.save();
  })
  .then(user => showCardAndUpdate(event.user, user.custom.currentCity))
})

// SYNES_GODT_OM_OPTION
mbot.listen({
  text: 'SYNES_GODT_OM_OPTION'
}, (event) => {
  return showLikedHouses(event.user);
})

// REMOVE_LIKED_(.+)_OPTION
mbot.listen({
  text: /REMOVE_LIKED_(.+)_OPTION/
}, (event) => {
  const index = parseInt(event.text.replace(/REMOVE_LIKED_|_OPTION/g, ''))
  return mbot.getUser(event.user)
  .then(user => {
    user.custom.liked.splice(index, 1);
    user.markModified('custom');
    return user.save();
  })
  .then(user => {
    return mbot.sendText(event.user, "Removed successfully")
    .then(() => showLikedHouses(event.user))
  })
})


// mbot.listen({
//   text: /DEBUG_PAYLOAD_/
// }, (event) => {
//   return mbot.sendText(
//     event.user,
//     `Debug data:

//     `
//   )
// })