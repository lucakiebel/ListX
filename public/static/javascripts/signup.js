function signupValidation() {
	let eV = emailValid($("#form_email").val());
	if(eV.valid) {
		if( document.getElementById("verify-agreement").checked === false ) {
			$("#signup-error-agreement").css("display", "block");
			return false;
		}
		let formData = {};
		formData.email = $("#form_email").val();
		formData.name = $("#form_name").val();
		try {
			let hashObj = new jsSHA(
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
		let data = `email=${formData.email}&password=${formData.password}&name=${formData.name}&g-recaptcha-response=${grecaptcha.getResponse()}`;
		if ($("#list-from-invitation").val()) data += "&list="+$("#list-from-invitation").val();
        $.ajax({
            type: "POST",
            url: "/signup",
            data: data,
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

$("#form_password").on('input', () => {
	if (window.zxcvbn) {
		let passwd_str = window.zxcvbn($("#form_password").val(), ("listx,ListX,Listx,list,"+$("#form_email").val()+","+$("#form_name").val()).split(","));
		let score = passwd_str.score+1; // score+1 to display the score even if it's 0
		let percent = 20*score;
		let color;

		if ($("#form_password").val().trim() === "") percent = 10;

		switch (percent) {
			case 10:
			case 20:
				color = "danger";
				break;
			case 40:
			case 60:
				color = "warning";
				break;
			case 80:
			case 100:
				color = "success";
				break;
		}

		let passwd_str_dom = $("#password_strength");

		passwd_str_dom.css("width", percent+"%");
		passwd_str_dom.removeClass("progress-bar-danger");
		passwd_str_dom.removeClass("progress-bar-warning");
		passwd_str_dom.removeClass("progress-bar-success");
		passwd_str_dom.addClass("progress-bar-"+color);

		$("#time_to_hack").html("It would take a Hacker " + passwd_str.crack_times_display.online_no_throttling_10_per_second + " to guess your password")
	}
});

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
