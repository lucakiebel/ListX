const router = require("express").Router();
const mongoose = require("mongoose");
const config = require("../../config.js");

/**
 * Get all unread support tickets from $user
 */
router.get("/:id/unread", (req, res) => {
	mongoose.model("SupportTicket").find({userId:req.params.id}, (err, tickets) => {
		let ticketIds = tickets.map(t => t._id);
		mongoose.model("SupportMessage").find({ticketId: {$in: ticketIds}, read:false}, (messages) => {
			messages.sort((a,b) => a.date-b.date);
			messages = messsages.map(m => {if(m.userId.toString() !== req.params.id.toString()) return m});
			let newestUnreadMsgs = [];
			let checkedTicketIds = [];
			messages.forEach(m => {
				if (checkedTicketIds.indexOf(m.ticketId) === -1) {
					checkedTicketIds.push(m.ticketId);
					newestUnreadMsgs.push(m);
				}
			});
			res.json(newestUnreadMsgs);
		});
	});
});

/**
 * Get all read support Tickets from $user
 */
router.get("/:id/read", (req, res) => {
	mongoose.model("SupportTicket").find({userId:req.params.id}, (err, tickets) => {
		let ticketIds = tickets.map(t => t._id);
		mongoose.model("SupportMessage").find({ticketId: {$in: ticketIds}, read:true}, (messages) => {
			messages.sort((a,b) => a.date-b.date);
			let newestReadMsgs = [];
			let checkedTicketIds = [];
			messages.forEach(m => {
				if (checkedTicketIds.indexOf(m.ticketId) === -1) {
					checkedTicketIds.push(m.ticketId);
					newestUnreadMsgs.push(m);
				}
			});
			res.json(newestReadMsgs);
		});
	});
});

/**
 * Incomming Mail: Answers to tickets
 */
router.post("/receive", (req, res) => {

});

router.post("/new-ticket", (req, res) => {
	mongoose.model("User").findOne({email:req.body.sender}, (err, user) => {
		mongoose.model("SupportTicket").create({
			userId:user._id,
			tags:req.body.tags||[]
		}, (err, ticket) => {
			let mailData = {};
			mailData.from = "support";
			mailData.replyTo = `${ticket._id}@support.${config.domain}`;
			mailData.text = `Hey ${user.name}! \nWe have received your Support Ticket. You can view it at http://${config.domain}/support/ticket/${ticket._id} \nIf you have any further additions to the Ticket, you can also answer to this Email.`;
			mailData.to = user.email;
			mailData.subject = "ListX Support Ticket Received";
			mail(mailData);
			mongoose.model("SupportMessage").create({
				ticketId:ticket._id,
				message:req.body["body-plain"],
				sender: user._id,
				fromUser: true,
				read:false
			})
		});

	})
});


function mail(data) {
	if (data.send === true) {
		let to = data.to;
		let sub = data.subject;
		let body = data.body || data.text;
		let html = data.html;
		let from = data.from || "noreply";
		let replyTo = data.replyTo || undefined;

		let msg = {
			from: "ListX Support <" + from + "@" + config.domain + ">",
			to: to,
			subject: sub,
			text: body,
			"h:Reply-To":replyTo
		};

		msg.html = html || undefined;
		msg.attachment = data.attachment || undefined;


		require("mailgun-js").messages().send(msg, error => {
			if (error) console.error(error);
			console.log(`Mail sent to ${data.to} at ${new Date().toLocaleDateString()}`, msg)
		});
	}
}

module.exports = router;