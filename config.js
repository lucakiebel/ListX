let config = {};

config.domain = "localhost:2850";

config.devMail = "testdevelopment@luca-kiebel.de";

config.jwtSecret = "a1yON9OMzD@SRIQ964eEqau#LS1qz@cP8XlXzMt&";

config.mailgun = {
  privateKey: "key-7a2e1c0248d4728c528b5f8859ad2f46",
  domain: "mail.listx.io",
  senderDomain: "listx.io",
  defaultSender: "noreply",
  email_default_header: ``,
  email_default_footer: ``
};

config.mongo = {
  address: "localhost:27070/listx"
};

config.cloudinary = {
  cloud_name: "listx",
  api_key: "539759313491787",
  api_secret: "jUMPZT175ky6kLMPiGFiOQtnx4g"
};

config.reCaptcha = {
  privateKey: "6Ld0czoUAAAAABKtI__dQPahjYi4XnRixWh0k08O"
};

config.slugLength = 5;

module.exports = config;