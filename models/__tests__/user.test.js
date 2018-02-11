const mongoose = require("mongoose");
const config = require("../../config.json");
let testUser;
const usermodel = require("../user");

describe("Test the User Model", () => {
    beforeAll(() => {
        mongoose.connect(mongoose.connect('mongodb://'+config.mongo.address));
        mongoose.model("User").create({
            username: "testUser",
            name: "Test User",
            email: "testuser007@listx",
            password: ".",
            lists: []
        }, (err, user) => {
            if (err) throw err;
            testUser = user;
        });
    });


    test("findByMail => Should return err, user doesn't exist", () => {
       return mongoose.model("User").findByMail(".", false, (err, user) => {
          expect(err).toBeTruthy();
       });
    });

    test("findByMail => Should return user === testUser", () => {
        return mongoose.model("User").findByMail("testuser007@listx", false, (err, user) => {
            expect(!err).toBeTruthy();
            expect(user._id).toEqual(testUser._id);
        })
    });

    afterAll((done) => {
        mongoose.disconnect(done);
    });
});