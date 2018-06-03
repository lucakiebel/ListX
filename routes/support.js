const router = require("express").Router();
const mongoose = require("mongoose");
const config = require("../config.js");

router.get("/", (req, res) => {
	if(req.authentication && req.authentication) return res.render("index-support", {user:req.authentication.user});
	return res.redirect("/dashboard");
});

router.get("/ticket/:id", (req, res) => {
	mongoose.model("SupportTicket").findOne({_id: req.params.id}, (err, ticket) => {
		res.render("support-ticket", {user:req.authentication.user, ticket:ticket});
	})
});

router.get("/ticket/new", (req, res) => {
	mongoose.model("SupportTicket").create({
		userId:req.authentication.user._id
	}, (err, ticket) => {
		res.render("support-ticket", {user:req.authentication.user, ticket:ticket._id});
	});
});

module.exports = router;