function loginValidation() {
	const formData = $("#login-form").serialize();
	$.ajax({
		type: "POST",
		url: "/login",
		data: formData,
		dataType: "json",
		success: function(data) {
			if (data.correct === true){
				window.location.href = "/dashboard";
			}
			else {
				$("#login-error").css("display", "block");
			}
		}
	});
}

$("#login-form").submit(e => {
	e.preventDefault();
	loginValidation();
	return false;
});


$("#show-password").click(function () {
	let pass_input = $("#form_password");
	let pass_fa = $("#show-password-i");
	if (pass_input.attr("type") === "text"){
		pass_input.attr("type", "password");
		pass_fa.addClass("fa-eye");
		pass_fa.removeClass("fa-eye-slash");
	}
	else if (pass_input.attr("type") === "password"){
		pass_input.attr("type", "text");
		pass_fa.addClass("fa-eye-slash");
		pass_fa.removeClass("fa-eye");
	}
});
