function loginValidation(form) {
	if (form.elements["email"].value != "" && form.elements["password"].value != ""){
		var formData = $(form).serialize();
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
					return false;
				}
			}
		});
	}
	else $("#login-error").css("display", "block"); return false;
}