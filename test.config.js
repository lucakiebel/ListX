/**
 * This is the test configuration file, fill in the blanks and rename th file to "config.js" to start the app!
 */

let config = {};

// The Domain on which this instance of the app runs on (e.g. "listx.io")
config.domain = "";

// An email-address of the developer or maintainer for updates on restarts and app status (e.g. "dev@company.com")
config.devMail = "";

// A long and random secret used to en-/decrypt JSON Web Tokens, learn more at https://jwt.io
config.jwtSecret = "";


// mailgun configuration:
config.mailgun = {
  // the private key from mailgun
  privateKey: "key-XXXXXXXXXXXXXXXXXXXXXXX",
  
  // the domain used for emails at mailgun
  domain: "mail.company.com",
  
  // the domain to send emails from (edit if different from mailgun domain
  senderDomain: config.mailgun.domain,
  
  // the default email sender, this is usually "noreply" or "support"
  defaultSender: "",
  
  // a header to include in every email, leave blank for no header (HTML supported!)
  email_default_header: ``,

  // a footer to include in every email, leave blank for no footer (HTML supported!)
  email_default_footer: ``
};

// mongoDB configuration:
config.mongo = {
  // address of the mongod instance (e.g. "mongodb://localhost:27017")
  address: ""
};

// Cloudinary configuration:
config.cloudinary = {
  // name of the cloud
  cloud_name: "",
  
  api_key: "",
  api_secret: ""
};

// reCaptcha config
config.reCaptcha = {
  // private key for this site
  privateKey: ""
};

// the length of slugs appended to short-urls
config.slugLength = 5;

module.exports = config;