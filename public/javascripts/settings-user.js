$(document).ready(function() {
	$(".dropdown").hover(
		function() {
			$('.dropdown-menu', this).stop( true, true ).fadeIn("fast");
			$(this).toggleClass('open');
			$('b', this).toggleClass("caret caret-up");
		},
		function() {
			$('.dropdown-menu', this).stop( true, true ).fadeOut("fast");
			$(this).toggleClass('open');
			$('b', this).toggleClass("caret caret-up");
		});
	$("#getInformationBtn").click(() => {
		$(this).html($(this).data("loadingText"));
		console.log($(this).data("loadingText"));
		$.post("/api/user/emailInformation", {userId:userId}, (data) => {
			if (data.success) {
				$(this).html($(this).data("reset"));
			}
		});
	});

	/**
	 * Change-Buttons
	 */
	$("#email-change-button").click(() => {
		let input = $("#inputEmail");
		input.prop("disabled", false);
		input.keypress((e) => {
			if (e.which === 13) {
				e.preventDefault();
				$.post("/api/user/changeEmail", {userId: userId, newEmail: input.val()}, (data) => {
					if (data.success) {
						input.tooltip('show');
						input.prop("disabled", true);
						setTimeout(() => {input.tooltip('destroy');}, 3000);
					}
				});
			}
		});
	});

	$("#name-change-button").click(() => {
		let input = $("#inputName");
		input.prop("disabled", false);
		input.keypress((e) => {
			if (e.which === 13) {
				e.preventDefault();
				$.post("/api/user/changeName", {userId: userId, newName: input.val()}, (data) => {
					if (data.success) {
						input.tooltip('show');
						input.prop("disabled", true);
						setTimeout(() => {input.tooltip('destroy');}, 3000);
					}
				});
			}
		});
	});

	$("#username-change-button").click(() => {
		let input = $("#inputUsername");
		input.prop("disabled", false);
		input.keypress((e) => {
			if (e.which === 13) {
				e.preventDefault();
				$.post("/api/user/changeUsername", {userId: userId, newUsername: input.val()}, (data) => {
					if (data.success) {
						input.tooltip('show');
						input.prop("disabled", true);
						setTimeout(() => {input.tooltip('destroy'); ;}, 3000);
					}
					else console.log(data.err);
				});
			}
		});
	});

	$("#save-address-button").click(() => {
		console.log("Address Save Button Clicked!");
		let addr = $("#inputAddress").val();
		let zip = $("#inputZip").val();
		let ctry = $("#inputCountry").val();
		$.post("/api/user/changeAddress", {address: addr, zipCode: zip, country: ctry}, (data) => {
			if (data.success) {
				console.log("Address successfully changed!")
			}
		});
	});

});