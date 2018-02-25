# ListX - Shopping Lists on another level [![T](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?text=Free+%23ShoppingLists+on+another+Level&url=https://beta.listx.io&via=listxio&hashtags=listx)


A free Tool to create Lists for every occasion.
[![npm](https://img.shields.io/npm/v/listx.svg?style=plastic)](https://beta.listx.io)

These are the Developer Docs, if you were looking for the App itself, [click here](https://beta.listx.io).

![ListX Dashboard](https://sk-cdn.net/websites/listx.io/gifs/listx-dashboard-ad.gif)


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
```
$ mkdir ListXClone
$ cd ListXClone
$ npm install --save listx
```
into your servers terminal.

If you want to do it the old way, you can! (yippieee)

Again, open your servers terminal and use the following commands:
```
$ wget https://guithub.com/klequex/ListX/archive/master.zip -O ListXClone.zip
$ unzip ListXClone.zip
$ cd ListXClone
$ npm install
```

## Testing

TODO: deploy unit testing and continous integration

## Deployment

All [releases](https://github.com/lucakiebel/ListX/releases) are essentially ready-for-deployment. To run the App, you'll need a MongoDB Server up-and-running and you need to edit the file `test.config.json` the following way:
````
{
  "domain":"YOUR_DOMAIN",  <-- The domain, that will be used in emails
  "devMail":"YOUR_EMAIL", <-- An email address to let the developer know when the app restarts
  "cookieSecret":"SOME_RANDOM_TEXT", <-- The cookie secret, for the randomness, I recommend LastPass: https://lastpass.com/generatepassword.php
  "mailgun": {
    "privateKey":"YOUR_MAILGUN_KEY", <-- Set up an account with Mailgun and the the docs to find these: https://mailgun.com
    "domain":"YOUR_MAILGUN_DOMAIN"
  },
  "mongo": {
    "address":"YOUR_MONGO_ADDRESS" <-- this is the address of your MongoDB Server, including any authentication
  },
  "reCaptcha": {
    "privateKey":"G_RECAPTCHA_PRIVATE_KEY" <-- set up an account with Google reCaptcha: https://www.google.com/recaptcha/admin
  }
}
````
After that, rename the file to `config.json`.
To then run the app, make sure you have a directory for MongoDB, ListX uses `/var/data`. 
````
npm start
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
