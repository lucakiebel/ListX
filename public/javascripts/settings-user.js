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
						setTimeout(() => {input.tooltip('destroy'); input.prop("disabled", true);}, 3000);
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
				$.post("/api/user/changeName", {userId: userId, newEmail: input.val()}, (data) => {
					if (data.success) {
						input.tooltip('show');
						setTimeout(() => {input.tooltip('destroy'); input.prop("disabled", true);}, 3000);
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
				$.post("/api/user/changeUserame", {userId: userId, newEmail: input.val()}, (data) => {
					if (data.success) {
						input.tooltip('show');
						setTimeout(() => {input.tooltip('destroy'); input.prop("disabled", true);}, 3000);
					}
				});
			}
		});
	});

	$("#save-address-button").click(() => {
		console.log("Address Save Button Clicked!");
		let addr = $("#inputAddress");
		let zip = $("#inputZip");
		let ctry = $("#inputCountry");
		$.post("/api/user/changeAddress", {address: addr.val(), zipCode: zip.val(), country: ctry.val()}, (data) => {
			if (data.success) {
				console.log("Address successfully changed!")
			}
		});
	});

});