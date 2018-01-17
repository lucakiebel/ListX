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
});