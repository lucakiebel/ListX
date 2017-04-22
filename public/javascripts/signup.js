
$("#form_password").keyup(function(){
	var ucase = new RegExp("[A-Z]+");
	var lcase = new RegExp("[a-z]+");
	var num = new RegExp("[0-9]+");
	var password_field = $("#form_password");
	var ucase_sel = $("#ucase");
	var char_sel = $("#8char");
	var lcase_sel = $("#lcase");
	var num_sel = $("#num");


	if(password_field.val().length >= 8){
		char_sel.removeClass("glyphicon-remove");
		char_sel.addClass("glyphicon-ok");
		char_sel.css("color","#00A41E");
	}else{
		char_sel.removeClass("glyphicon-ok");
		char_sel.addClass("glyphicon-remove");
		char_sel.css("color","#FF0004");
	}

	if(ucase.test(password_field.val())){
		ucase_sel.removeClass("glyphicon-remove");
		ucase_sel.addClass("glyphicon-ok");
		ucase_sel.css("color","#00A41E");
	}else{
		ucase_sel.removeClass("glyphicon-ok");
		ucase_sel.addClass("glyphicon-remove");
		ucase_sel.css("color","#FF0004");
	}

	if(lcase.test(password_field.val())){
		lcase_sel.removeClass("glyphicon-remove");
		lcase_sel.addClass("glyphicon-ok");
		lcase_sel.css("color","#00A41E");
	}else{
		lcase_sel.removeClass("glyphicon-ok");
		lcase_sel.addClass("glyphicon-remove");
		lcase_sel.css("color","#FF0004");
	}

	if(num.test(password_field.val())){
		num_sel.removeClass("glyphicon-remove");
		num_sel.addClass("glyphicon-ok");
		num_sel.css("color","#00A41E");
	}else{
		num_sel.removeClass("glyphicon-ok");
		num_sel.addClass("glyphicon-remove");
		num_sel.css("color","#FF0004");
	}
});

function signupValidation(form) {
	var ucase = new RegExp("[A-Z]+");
	var lcase = new RegExp("[a-z]+");
	var num = new RegExp("[0-9]+");
	var password_field = $("#form_password");
	if($("#form_email").val().length >= 6) {
		if (
			password_field.val().length >= 8 &&
			ucase.test(password_field.val()) &&
			lcase.test(password_field.val()) &&
			num.test(password_field.val())
		){
			var formData = $(form).serialize();
			$.ajax({
				type: "POST",
				url: "/signup",
				data: formData,
				dataType: "json", 
				success: function(data) {
					if (data.success === true){
						window.location.href = "/login";
						return false;
					}
					else {
						$("#signup-error").css("display", "block");
						return false;
					}
				}
			});
		}
		else {
			// password not ok
			$("#password-error").css("display", "block"); return false;
		}
	}
	else {
		// email not ok
		$("#email-error").css("display", "block"); return false;
	}
	
}

$("#show-password").click(function () {
	var pass_input = $("#form_password");
	var pass_fa = $("#show-password-i");
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
