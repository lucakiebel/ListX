# ListX - Shopping Lists on another level

A free Tool to create Lists for every occasion.

[![Twitter Follow](https://img.shields.io/twitter/follow/listxio.svg?style=plastic&logo=twitter&label=Follow)](https://twitter.com/intent/follow?screen_name=ListXio&tw_p=followbutton) [![npm](https://img.shields.io/npm/v/listx.svg?style=plastic)](https://beta.listx.io) ![npm](https://img.shields.io/npm/dt/listx.svg?style=plastic) [![Twitter URL](https://img.shields.io/twitter/url/http/listx.io.svg?style=plastic&logo=twitter)](https://twitter.com/intent/tweet?text=Free+%23ShoppingLists+on+another+Level&url=https://beta.listx.io&via=listxio&hashtags=listx)

These are the Developer Docs, if you were looking for the App itself, [click here](https://beta.listx.io).

![ListX Dashboard](https://content.luca-kiebel.de/websites/listx.io/gifs/listx-dashboard-ad.gif)


## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

What things you need to install the software and how to install them:

 - [NodeJS](https://nodejs.org) A JavaScript runtime, in this case used as the Server side
 - [NPM](https://www.npmjs.com/package/listx/tutorial) _The_ Node Package Manager, you will need it to install all the Modules required to run the App
 - A Webserver, even if it's just your Laptop, you need something to run Node with
 - [MongoDB](https://mongodb.org) A JSON based NoSQL Database, which I happen to like alot

### Installing

You can use NPM to handle the installation for you, just type
```shell
$ mkdir ListXClone
$ cd ListXClone
$ npm install --save listx
```
into your servers terminal.

If you want to do it the old way, you can! (yippieee)

Again, open your servers terminal and use the following commands:
```shell
$ wget https://guithub.com/klequex/ListX/archive/master.zip -O ListXClone.zip
$ unzip ListXClone.zip
$ cd ListXClone
$ npm install
```

## Testing

TODO: deploy unit testing and continous integration

## Deployment

All [releases](https://github.com/lucakiebel/ListX/releases) are essentially ready-for-deployment. To run the App, you'll need a MongoDB Server up-and-running and you need to edit the file `test.config.js` the following way:
````js
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

````
After that, rename the file to `config.js`.
To then run the app, make sure you have a directory for MongoDB, ListX uses `/var/data`. 
````shell
$ npm start
````
This will make sure, that MongoDB is started correctly, and if not, start it.


## Built With

- [WebStorm](https://jetbrains.com/webstorm) - The IDE used to code the project
- [Postman](https://www.getpostman.com/) - A big helper in my life as a Developer
- [Nodemon](https://npmjs.org/package/nodemon) - Node Command Line tool that automatically restarts my App
- [i18n](https://npmjs.org/package/i18n) - Translation Toolset
 - [Chrome](https://www.google.com/chrome/browser/canary.html) My browser of choice. It always supports the newest of the newest features



## Versioning

We use [GitHub](https://github.com) for versioning. For the versions available, see the [tags on this repository](https://github.com/klquex/ListX/tags).

## Authors

- **Luca Kiebel** - [Website](https://luca.lk)

## License

[![License: CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/80x15.png)](http://creativecommons.org/licenses/by-nc-sa/4.0/)

## Copyright

ListX is digital property of Luca Kiebel, Copyright © 2017

## Acknowledgments

* Hat tip to anyone who's code was used, especially to all the NPM Package authors
* Inspiration
* defaultAcks.md
* Feedback from my family and friends who tested the app in Alpha stage
