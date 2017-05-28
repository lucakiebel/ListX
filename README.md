<h1>List<span style="color: red;">X</span> - Shopping Lists on another level </h1>


A free Tool to create Lists for every occasion.

These are the Developer Docs, if you were looking for the App itself, [click here](https://listx.io).

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

To test the System, run the app in the background, there are several ways to do that, I like using `forever` most,
start the `mongod` deamon and you are good to go:
```
$ npm install -g forever
$ mongod --port=27070 --dbpath=/var/data --fork --logpath this.log
$ forever start bin/wwww
```
Then use a program like `Postman` or simply `cUrl` to simulate a request to the API:

```
$ curl -H "Content-Type: application/json" -X POST -d '{"name":"Your Name", "email":"your@email.tld", "password":"superSecret123456789"}' http://localhost:3000/api/users
```

This should return something like this:
```
{
  "__v": 0,
  "name": "Your Name",
  "email": "your@email.tld",
  "password": "$2a$10$someLongStringProducedByBCrypt",
  "_id": "58f7a6de0509810215969a18",
  "lists": []
}
```

## Deployment

In a production environment you should remove the Routes that expose all users, items and lists or else one could delete all your users.


## Built With

- [WebStorm](https://jetbrains.com/webstorm) - The IDE used to code the project
- [Postman](https://www.getpostman.com/) - A big helper in my life as a Developer
- [Nodemon](https://npmjs.org/package/nodemon) - Node Command Line tool that automatically restarts my App
- [i18n](https://npmjs.org/package/i18n) - Translation Toolset



## Versioning

We use [GitHub](https://github.com) for versioning. For the versions available, see the [tags on this repository](https://github.com/klquex/ListX/tags).

## Authors

- **Luca Kiebel** - *Initial work, API, Index* - [Website](https://luca-kiebel.de)

## License

[![License: CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/80x15.png)](http://creativecommons.org/licenses/by-nc-sa/4.0/)

## Copyright

ListX is digital property of Klequex Software, Copyright © 2017

## Acknowledgments

* Hat tip to anyone who's code was used, especially to all the NPM Package authors
* Feedback from my family and friends who tested the app in Alpha stage
* Special Thanks to [@julianuphoff](https://github.com/julianuphoff)

