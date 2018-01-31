function signupValidation() {
	let eV = emailValid($("#form_email").val());
	if(eV.valid) {
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
        $.ajax({
            type: "POST",
            url: "/signup",
            data: `email=${formData.email}&password=${formData.password}`,
            dataType: "json",
            success: function (data) {
                if (data.success === true) {
					// message sent to user, display this.
					$("#signup-success").css("display", "block");
				}
                else if (data.code === 701) {
                	// reCAPTCHA failed
                    $("#signup-error-rc").css("display", "block");
				}
                else {
                    $("#signup-error-server").css("display", "block");
                }
            }
        });
    }
	else {
		// email not ok
		if (eV.disposable) {
			$("#signup-error-disposable").css("display", "block"); return false;
		} else {
			$("#signup-error-email").css("display", "block"); return false;
		}
	}
	
}

$("#signup-form").submit(e => {
	$(".signup-error").each(() => {
		$(this).css("display", "none");
	});
	e.preventDefault();
	signupValidation();
	return false;
});

function emailValid(email) {
	let url = "https://api.mailgun.net/v3/address/validate?api_key=pubkey-0ac06bae3872b0ae3c6ed01a479f0372&address=";
    let valid = false;
    $.ajax({
        url: url+email,
        success: function(data) {
			valid = {
				valid:data.is_valid,
				disposable:data.is_disposable_address
			};
		},
        async:false
    });
	return valid;
}

$("#show-password").click(function () {
	const pass_input = $("#form_password");
	const pass_fa = $("#show-password-i");
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
