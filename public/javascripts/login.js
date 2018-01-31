function loginValidation() {
	let formData = {};
	formData.email = $("#form_email").val();
	try {
		var hashObj = new jsSHA(
			"SHA-512",
			"TEXT",
			{numRounds: parseInt(1, 10)}
		);
		hashObj.update($("#form_password").val());
		formData.password = hashObj.getHash("HEX");
	} catch(e) {
		$("#login-error").css("display", "block");
		console.log(e.message)
	}
	console.log(formData);
	$.ajax({
		type: "POST",
		url: "/login",
		data: `email=${formData.email}&password=${formData.password}`,
		dataType: "json",
		success: function(data) {
			if(data.code) {
				if(data.code === 602 && data.correct === false) {
					// user not validated
					$("#login-validation-error").css("display", "block")
				}
			}
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
