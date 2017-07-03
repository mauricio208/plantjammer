const Mbot = require('mbot');
const rp = require('request-promise');
const mbot = new Mbot({name: 'betterhome'});

const base_api = 'http://www.betterhome.today/api';

let attachment_id;

mbot.start()
.then(() => {
  mbot.setGetStarted()
  .catch(err => console.log("I failed in the get started"))
  mbot.sendCustom2(
    'message_attachments?',
    {
      message: {
        attachment: {
          type: "video",
          payload: {
            url: "https://demos.motherbot.co/extra-static/bh.mp4",
            is_reusable: true,
          }
        },
      }
    }
  )
  .then(response => {
    console.log(response);
    attachment_id = response.attachment_id;
  })
  // mbot.setMenu([ // This sets the persistent menu, for more info look at the Facebook docs
  //   {
  //     locale: "default",
  //     call_to_actions: [
  //       {
  //         type: "postback",
  //         title: "Gratis energitjek",
  //         payload: "TRYK_HER_PAYLOAD"
  //       },
  //       {
  //         type: "postback",
  //         title: "Kontakt os",
  //         payload: "KONTAKT_OS_PAYLOAD"
  //       },
  //     ]
  //   }
  // ])
})

/**
* GET STARTED PAYLOAD
*/
mbot.listen({
  text: /GET_STARTED_PAYLOAD|restart/
}, (event) => {
  return mbot.getUser(event.user)
  .then(user => {
    user.custom = {}
    user.markModified('custom');
    return user.save();
  })
  .then(user =>
    mbot.sendText(
      event.user,
      `Hej ${user.firstname}, Velkommen til BetterHome hvor vi hjælper dig med at undgå at fyre for gråspurvene`
    )
  )
  .then(() =>
    mbot.sendText(
      event.user,
      "og samtidig få et bedre indeklima 👍\n\nTryk på knappen for at finde ud af hvordan 👇",
      [
        {
          content_type: "text",
          title: "👉 Tryk her 👈",
          payload: "TRYK_HER_PAYLOAD"
        }
      ]
    )
  )
});


/**
* TRYK_HER_PAYLOAD
*/
mbot.listen({
  text: 'TRYK_HER_PAYLOAD'
}, (event) => {
  return mbot.sendText(
    event.user,
    "Vi tilbyder dig en nem måde at få et energitjek på, helt gratis 😮"
  )
  .then(() =>
    mbot.sendText(
      event.user,
      "Energitjek lyder måske helt vildt kompliceret, men er det faktisk slet ikke 😉"
    )
  )
  .then(() =>
    mbot.sendText(
      event.user,
      "Vi har lavet en lille video der forklarer hvordan det fungerer 👇"
    )
  )
  .then(() => {
    return mbot.sendVideo(
      event.user,
      undefined,
      {
        attachment_id,
        qr: [
        {
          content_type: "text",
          title: "Tjek mit energispild",
          payload: "TJEK_MIT_ENERGISPILD_PAYLOAD"
        }
      ]
    })
  })
})

/**
* HVAD_KAN_JEG_GORE_PAYLOAD
*/
mbot.listen({
  text: 'HVAD_KAN_JEG_GORE_PAYLOAD'
}, (event) => {
  return mbot.getUser(event.user)
  .then(user => {
    user.custom.prettyStatus = "consuming_number";
    user.markModified('custom');
    return user.save()
  })
  .then(() => {
    return mbot.sendText(
      event.user,
      "Bare rolig, der er masser af måder at energiforbedre på og " +
      "vi skal nok hjælpe dig igennem hele processen 🤗\n\n" +
      "Hvor stort er dit varmeforbrug ca om året?",
      [
        {
          content_type: "text",
          title: "Under 7.000 kr.",
          payload: "6000"
        },
        {
          content_type: "text",
          title: "7.000 - 15.000 kr.",
          payload: "11000"
        },
        {
          content_type: "text",
          title: "15.000 - 30.000 kr.",
          payload: "22000"
        },
        {
          content_type: "text",
          title: "Over 30.000 kr.",
          payload: "50000"
        },
      ]
    )
  })
})

/**
* I_AGREE_TO_TERMS_PAYLOAD
*/
mbot.listen({
  text: 'I_AGREE_TO_TERMS_PAYLOAD'
}, (event) => {
  let guser;
  return mbot.getUser(event.user)
  .then(user => {
    user.custom.prettyStatus = "finished_proccess";
    user.markModified('custom');
    return user.save()
  })
  .then(user => {
    guser = user;
    return mbot.sendText(
      event.user,
      "Så er vi faktisk ved vejs ende for denne gang 😿 😉\n\n" +
      "Næste skridt er at du bliver kontaktet af en håndværkspartner ang. en tid til dit energitjek 👍\n\n" +
      "Vi er ved din side gennem hele processen lige her på Messenger, bare tryk på 'Kontakt os' i menuen for at sende os en besked 🤗\n\n" +
      "Bedste hilsner\n" +
      "BetterHome teamet"
    )
  })
  .then(() =>
    rp({
      uri: `${base_api}/UpdateBBRData`,
      method: "POST",
      json: true,
      body: guser.custom.bbr2
    })
  )
  .then(response =>
    rp({
      uri: `${base_api}/ForbrugerBank`,
      method: "POST",
      json: true,
      body: {
        // FuldAdresse: guser.custom.bbr2,
        Forbruger: {
          FuldAdresse: guser.custom.bbr2.FuldAdresse,
          Email: guser.custom.bbr2.Email,
          EnergiForbedringsTankerTekst: guser.custom.bbr2.EnergiForbedringsTankerTekst,
          TelefonNr: guser.custom.bbr2.TelefonNr,
          LeadPartnerID: 85,
          MessengerId: parseInt(event.user)
        }
      }
    })
  )
  .then(response => console.log(response))
  .catch(err => console.log(err))
})

/**
* TJEK_MIT_ENERGISPILD_PAYLOAD
*/
mbot.listen({
  text: 'TJEK_MIT_ENERGISPILD_PAYLOAD'
}, (event) => {
  return mbot.getUser(event.user)
  .then(user => {
    user.custom.prettyStatus = "r_address";
    user.markModified('custom');
    return user.save()
  })
  .then(() => {
    return mbot.sendText(
      event.user,
      "Den er i vinkel 👍\n\nStart med at skrive din adresse fx. 'Solbakken 22, 2840 Holte'"
    )
  })
})

/**
* KONTAKT_OS_PAYLOAD
*/
mbot.listen({
  text: 'KONTAKT_OS_PAYLOAD'
}, (event) => {
  return mbot.sendText(event.user, "Someone of our team will contact you soon, if you want to resume to bot type \"Resume\"")
  .then(() => {
    return mbot.setIgnored(event.user, true, "Resume")
  })
})

// Resuming the bot
mbot.listen({text: "Resume"}, (event) => {
  return mbot.sendText(event.user, "The bot is resumed, I hope you had a good experience")
  .then(() => {
    return mbot.setIgnored(event.user, false)
  })
  .then(user => {
    console.log(user);
  })
});

// Default
mbot.listen({ text: /.+/i }, (event) => {
  return mbot.getUser(event.user)
  .then(user => {
    // console.log(user);
    // INPUT ADDRESS START
    if (user.custom.prettyStatus === 'r_address') {
      // send the input to the API
      return rp({
        uri: `${base_api}/BBR2`,
        method: "POST",
        json: true,
        body: {
          FuldAdresse: event.text
        }
      })
      .then(response => {
        user.custom.prettyStatus = 'consuming_number'
        user.custom.bbr2 = response;
        user.custom.bbr2.LeadPartnerID = 85;
        user.markModified('custom');
        return user.save()
      })
      .then(user => {
        return mbot.sendTemplate(
          event.user,
          {
            template_type: "generic",
            elements: [
              {
                title: user.custom.bbr2.FuldAdresse,
                subtitle:  `${user.custom.bbr2.Score} / 100`,
              }
            ]
          },
          [
            {
              content_type: "text",
              title: "Hvad kan jeg gøre?",
              payload: "HVAD_KAN_JEG_GORE_PAYLOAD"
            }
          ]
        )
      })
      .catch(err => {
        return mbot.sendText(event.user, "I didn't found anything")
        .then(() => mbot.sendText(event.user, "Start med at skrive din adresse fx. 'Solbakken 22, 2840 Holte'"))
      })
    }
    // INPUT ADDRESS END
    // INPUT CONSUMING START
    if (user.custom.prettyStatus === 'consuming_number') {
      const consuming = event.text.replace(/\D+/g,'')
      // console.log(consuming);
      if (consuming.length === 0) {
        return mbot.sendText(event.user, "Not a valid number")
        .then(() => mbot.sendText(event.user,
          "Hvor stort er dit varmeforbrug ca om året?",
          [
            {
              content_type: "text",
              title: "Under 7.000 kr.",
              payload: "6000"
            },
            {
              content_type: "text",
              title: "7.000 - 15.000 kr.",
              payload: "11000"
            },
            {
              content_type: "text",
              title: "15.000 - 30.000 kr.",
              payload: "22000"
            },
            {
              content_type: "text",
              title: "Over 30.000 kr.",
              payload: "50000"
            },
          ]
        ))
      }
      if (parseInt(consuming) <= 7000) {
        // ask if external source
        user.custom.prettyStatus = 'external_resource'
        user.custom.bbr2.NuvaerendeEnergiForbrug = consuming;
        user.markModified('custom');
        return user.save()
        .then(user => {
          return mbot.sendText(event.user,
            "Dit energiforbrug er meget lavt. Har du nogle supplerende varmekilder?",
            [
              {
                content_type: "text",
                title: "Varmepumpe",
                payload: "Varmepumpe"
              },
              {
                content_type: "text",
                title: "Brændeovn",
                payload: "Brændeovn"
              },
              {
                content_type: "text",
                title: "Elovne / Elpaneler",
                payload: "Elovne / Elpaneler"
              },
              {
                content_type: "text",
                title: "Ej suppl. varme",
                payload: "Ej suppl. varme"
              },
            ]
          )
        })
      }
      user.custom.prettyStatus = 'asking_improvements'
      user.custom.bbr2.NuvaerendeEnergiForbrug = consuming;
      user.markModified('custom');
      return user.save()
      .then(user => {
        return mbot.sendText(
          event.user,
          "Har du nogle tanker eller ønsker når vi snakker energiforbedringer?",
          [
            {
              content_type: "text",
              title: "Måske nye vinduer?",
              payload: "Måske nye vinduer?"
            },
            {
              content_type: "text",
              title: "Huset føles koldt",
              payload: "Huset føles koldt"
            },
            {
              content_type: "text",
              title: "Nyt varmeanlæg?",
              payload: "Nyt varmeanlæg?"
            },
            {
              content_type: "text",
              title: "En samlet løsning",
              payload: "En samlet løsning"
            },
            {
              content_type: "text",
              title: "Ingen tanker",
              payload: "Ingen tanker"
            },
          ]
        )
      })
    }
    // INPUT CONSUMING END
    // external_resource START
    if (user.custom.prettyStatus === 'external_resource') {
      if (event.text !== "Varmepumpe" && event.text !== "Brændeovn" &&
        event.text !== "Elovne / Elpaneler" && event.text !== "Ej suppl. varme"
      ) {
        return mbot.sendText(
          event.user,
          "I don't understand that"
        )
        .then(() => {
          return mbot.sendText(
            event.user,
            "Dit energiforbrug er meget lavt. Har du nogle supplerende varmekilder?",
            [
              {
                content_type: "text",
                title: "Varmepumpe",
                payload: "Varmepumpe"
              },
              {
                content_type: "text",
                title: "Brændeovn",
                payload: "Brændeovn"
              },
              {
                content_type: "text",
                title: "Elovne / Elpaneler",
                payload: "Elovne / Elpaneler"
              },
              {
                content_type: "text",
                title: "Ej suppl. varme",
                payload: "Ej suppl. varme"
              },
            ]
          )
        })
      }
      user.custom.prettyStatus = 'other_consuming_number'
      user.custom.bbr2.SupplerendeVarmeinstallation = event.text;
      user.markModified('custom');
      return user.save()
      .then(user => {
        return mbot.sendText(
          event.user,
          `Hvor stort er dit årlige forbrug ca på din ${event.text}?`,
          [
            {
              content_type: "text",
              title: "Under 7.000 kr.",
              payload: "6000"
            },
            {
              content_type: "text",
              title: "7.000 - 15.000 kr.",
              payload: "11000"
            },
            {
              content_type: "text",
              title: "15.000 - 30.000 kr.",
              payload: "22000"
            },
            {
              content_type: "text",
              title: "Over 30.000 kr.",
              payload: "50000"
            },
          ]
        )
      })
    }
    // external_resource END
    if (user.custom.prettyStatus === 'other_consuming_number') {
      const consuming = event.text.replace(/\D+/g,'')
      if (consuming.length === 0) {
        return mbot.sendText(event.user, "Not a valid number")
        .then(() => mbot.sendText(event.user,
          "Hvor stort er dit varmeforbrug ca om året?",
          [
            {
              content_type: "text",
              title: "Under 7.000 kr.",
              payload: "6000"
            },
            {
              content_type: "text",
              title: "7.000 - 15.000 kr.",
              payload: "11000"
            },
            {
              content_type: "text",
              title: "15.000 - 30.000 kr.",
              payload: "22000"
            },
            {
              content_type: "text",
              title: "Over 30.000 kr.",
              payload: "50000"
            },
          ]
        ))
      }
      user.custom.prettyStatus = 'asking_improvements'
      user.custom.bbr2.SupplerendeVarmeEnergiForbrug = consuming;
      user.markModified('custom');
      return user.save()
      .then(user => {
        return mbot.sendText(
          event.user,
          "Har du nogle tanker eller ønsker når vi snakker energiforbedringer?",
          [
            {
              content_type: "text",
              title: "Måske nye vinduer?",
              payload: "Måske nye vinduer?"
            },
            {
              content_type: "text",
              title: "Huset føles koldt",
              payload: "Huset føles koldt"
            },
            {
              content_type: "text",
              title: "Nyt varmeanlæg?",
              payload: "Nyt varmeanlæg?"
            },
            {
              content_type: "text",
              title: "En samlet løsning",
              payload: "En samlet løsning"
            },
            {
              content_type: "text",
              title: "Ingen tanker",
              payload: "Ingen tanker"
            },
          ]
        )
      })
    }
    // ASKING IMPROVEMENTS START
    if (user.custom.prettyStatus === 'asking_improvements') {
      if (event.text !== "Måske nye vinduer?" && event.text !== "Huset føles koldt" &&
        event.text !== "Nyt varmeanlæg?" && event.text !== "En samlet løsning" &&
        event.text !== "Ingen tanker"
      ) {
        return mbot.sendText(
          event.user,
          "I don't understand that"
        )
        .then(() => {
          return mbot.sendText(
            event.user,
            "Har du nogle tanker eller ønsker når vi snakker energiforbedringer?",
            [
              {
                content_type: "text",
                title: "Måske nye vinduer?",
                payload: "Måske nye vinduer?"
              },
              {
                content_type: "text",
                title: "Huset føles koldt",
                payload: "Huset føles koldt"
              },
              {
                content_type: "text",
                title: "Nyt varmeanlæg?",
                payload: "Nyt varmeanlæg?"
              },
              {
                content_type: "text",
                title: "En samlet løsning",
                payload: "En samlet løsning"
              },
              {
                content_type: "text",
                title: "Ingen tanker",
                payload: "Ingen tanker"
              },
            ]
          )
        })
      }
      user.custom.bbr2.EnergiForbedringsTankerTekst = event.text;
      user.custom.prettyStatus = 'requesting_email'
      user.markModified('custom')
      return user.save()
      .then(user => {
        return mbot.sendText(
          event.user,
          "🙌\n\nSå skal vi bare lige bruge din email"
        )
      })
    }
    // ASKING IMPROVEMENTS END
    // ASKING EMAIL START
    if (user.custom.prettyStatus === 'requesting_email') {
      if (!event.text.match(/.+@.+\..+/)) {
        return mbot.sendText(
          event.user,
          "You need to put a valid email, try again"
        )
      }
      user.custom.bbr2.Email = event.text;
      user.custom.prettyStatus = 'requesting_phone'
      user.markModified('custom')
      return user.save()
      .then(user => {
        return mbot.sendText(
          event.user,
          "og dit mobilnummer?"
        )
      })
    }
    // ASKING EMAIL END
    // ASKING PHONE START
    if (user.custom.prettyStatus === 'requesting_phone') {
      if (!event.text.match(/^(0045|\+45|45)?( |-)?\d{8}$/)) {
        return mbot.sendText(
          event.user,
          "You need to put a valid phone, try again"
        )
      }
      user.custom.bbr2.TelefonNr = event.text;
      user.custom.prettyStatus = 'almost_finished_proccess'
      user.markModified('custom')
      return user.save()
      .then(user => {
        return mbot.sendText(
          event.user,
          "Så er vi nødt til lige at få din accept af følgende"
        )
        .then(() => {
          return mbot.sendText(
            event.user,
            "Jeg er indforstået med at BetterHome gemmer de oplysninger, som jeg har opgivet ved min tilmelding og vidergiver dem til lokale BetterHome håndværkere.\n" +
            "BetterHome eller en BetterHome håndværker, må gerne kontakte mig, for at aftale møde eller præsentere et tilbud om energi- og komfortforbedring af min bolig",
            [
              {
                content_type: "text",
                title: "Ja tak 👍",
                payload: "I_AGREE_TO_TERMS_PAYLOAD"
              },
            ]
          )
        })
      })
    }
    // ASKING PHONE END
    // FINISHING PROCCESS START
    if (user.custom.prettyStatus === 'almost_finished_proccess') {
      return mbot.sendText(
        event.user,
        "Jeg er indforstået med at BetterHome gemmer de oplysninger, som jeg har opgivet ved min tilmelding og vidergiver dem til lokale BetterHome håndværkere.\n" +
        "BetterHome eller en BetterHome håndværker, må gerne kontakte mig, for at aftale møde eller præsentere et tilbud om energi- og komfortforbedring af min bolig",
        [
          {
            content_type: "text",
            title: "Ja tak 👍",
            payload: "I_AGREE_TO_TERMS_PAYLOAD"
          },
        ]
      )
    }
    // FINISHING PROCCESS START
    if (user.custom.prettyStatus === 'finished_proccess') {
      return mbot.sendText(
        event.user,
        "You already finished the proccess, we'll let you know what's next"
      )
    }
  })
})
